require "json"
require "net/http"

# Prints each Mailpit message's HTML check support, the average and the weakest features.
class MailpitScore
  FEATURE_LIMIT = 12

  # @param [String] base_url
  # @return [void]
  def self.call(...)
    new(...).call
  end

  # @param [String] base_url
  def initialize(base_url: ENV.fetch("MAILPIT_URL", "http://localhost:8025"))
    @base_url = base_url
  end

  # @return [void]
  def call
    abort "No messages in Mailpit. Run send.sh first." if checks.empty?

    checks.each { |subject, check| puts message_line(subject, check["Total"]) }
    puts format("AVERAGE SUPPORTED: %.1f%%", average_supported)
    puts "Weakest features (average support across emails):"
    weakest_features.each { |slug, scores| puts feature_line(slug, scores) }
  end

  private

  attr_reader :base_url

  def checks
    @checks ||= messages.map { |message| [message["Subject"], get("/message/#{message["ID"]}/html-check")] }
  end

  def messages
    get("/messages?limit=100")["messages"]
  end

  def average_supported
    checks.sum { |_, check| check["Total"]["Supported"] } / checks.size
  end

  def weakest_features
    scores_by_feature.sort_by { |_, scores| average(scores) }.first(FEATURE_LIMIT)
  end

  def scores_by_feature
    warnings = checks.flat_map { |_, check| check["Warnings"] }

    warnings.group_by { |warning| warning["Slug"] }.transform_values do |grouped|
      grouped.map { |warning| warning["Score"]["Supported"] }
    end
  end

  def average(scores)
    scores.sum / scores.size
  end

  def message_line(subject, support)
    format(
      "%<subject>-45s supported %<supported>.1f  partial %<partial>.1f  unsupported %<unsupported>.1f",
      subject: subject[0, 45], supported: support["Supported"], partial: support["Partial"],
      unsupported: support["Unsupported"]
    )
  end

  def feature_line(slug, scores)
    format(
      "  %<slug>-24s %<average>.0f%%  (in %<count>d emails)",
      slug: slug, average: average(scores), count: scores.size
    )
  end

  def get(path)
    JSON.parse(Net::HTTP.get(URI("#{base_url}/api/v1#{path}")))
  end
end

MailpitScore.call
