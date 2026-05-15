require 'spec_helper'
require 'captchax/models'

RSpec.describe CaptchaX::CharPosition do
  describe '#initialize' do
    it 'creates CharPosition with all attributes' do
      position = described_class.new(char: 'A', x: 100, y: 50)
      expect(position.char).to eq('A')
      expect(position.x).to eq(100)
      expect(position.y).to eq(50)
    end

    it 'creates CharPosition with default values' do
      position = described_class.new
      expect(position.char).to be_nil
      expect(position.x).to be_nil
      expect(position.y).to be_nil
    end
  end

  describe '#to_h' do
    it 'converts to hash' do
      position = described_class.new(char: 'B', x: 200, y: 150)
      hash = position.to_h
      expect(hash['char']).to eq('B')
      expect(hash['x']).to eq(200)
      expect(hash['y']).to eq(150)
    end
  end

  describe '.from_h' do
    it 'creates from hash' do
      hash = { 'char' => 'C', 'x' => 300, 'y' => 250 }
      position = described_class.from_h(hash)
      expect(position.char).to eq('C')
      expect(position.x).to eq(300)
      expect(position.y).to eq(250)
    end

    it 'handles nil values' do
      position = described_class.from_h({})
      expect(position.char).to be_nil
      expect(position.x).to be_nil
      expect(position.y).to be_nil
    end
  end
end

RSpec.describe CaptchaX::SliderCaptchaResult do
  describe '#initialize' do
    it 'creates with all attributes' do
      result = described_class.new(
        id: 'slider-123',
        background_b64: 'base64bg',
        slider_b64: 'base64slider',
        target_x: 100,
        target_y: 50
      )
      expect(result.id).to eq('slider-123')
      expect(result.background_b64).to eq('base64bg')
      expect(result.slider_b64).to eq('base64slider')
      expect(result.target_x).to eq(100)
      expect(result.target_y).to eq(50)
    end
  end

  describe '.from_h' do
    it 'creates from hash' do
      hash = {
        'id' => 'slider-456',
        'background_b64' => 'bg',
        'slider_b64' => 'slider',
        'target_x' => 200,
        'target_y' => 100
      }
      result = described_class.from_h(hash)
      expect(result.id).to eq('slider-456')
      expect(result.background_b64).to eq('bg')
      expect(result.slider_b64).to eq('slider')
      expect(result.target_x).to eq(200)
      expect(result.target_y).to eq(100)
    end

    it 'handles missing fields' do
      result = described_class.from_h({})
      expect(result.id).to be_nil
      expect(result.target_x).to be_nil
    end
  end
end

RSpec.describe CaptchaX::SliderVerifyResult do
  describe '#initialize' do
    it 'creates with success and message' do
      result = described_class.new(success: true, message: 'Verified')
      expect(result.success).to eq(true)
      expect(result.message).to eq('Verified')
    end

    it 'creates with default message' do
      result = described_class.new(success: false)
      expect(result.message).to be_nil
    end
  end

  describe '.from_h' do
    it 'creates from hash' do
      hash = { 'success' => true, 'message' => 'OK' }
      result = described_class.from_h(hash)
      expect(result.success).to eq(true)
      expect(result.message).to eq('OK')
    end
  end
end

RSpec.describe CaptchaX::ClickCaptchaResult do
  describe '#initialize' do
    it 'creates with all attributes' do
      result = described_class.new(
        id: 'click-123',
        image: 'base64image',
        target_chars: %w[A B C],
        char_positions: [CaptchaX::CharPosition.new(char: 'A', x: 100, y: 50)]
      )
      expect(result.id).to eq('click-123')
      expect(result.image).to eq('base64image')
      expect(result.target_chars).to eq(%w[A B C])
      expect(result.char_positions).to be_an(Array)
    end

    it 'initializes with empty arrays' do
      result = described_class.new
      expect(result.target_chars).to eq([])
      expect(result.char_positions).to eq([])
    end
  end

  describe '.from_h' do
    it 'creates from hash with char positions' do
      hash = {
        'id' => 'click-456',
        'image' => 'base64',
        'target_chars' => %w[X Y],
        'char_positions' => [
          { 'char' => 'X', 'x' => 100, 'y' => 50 },
          { 'char' => 'Y', 'x' => 200, 'y' => 100 }
        ]
      }
      result = described_class.from_h(hash)
      expect(result.id).to eq('click-456')
      expect(result.target_chars).to eq(%w[X Y])
      expect(result.char_positions.length).to eq(2)
      expect(result.char_positions.first).to be_a(CaptchaX::CharPosition)
    end

    it 'handles missing char_positions' do
      hash = { 'id' => 'click-789', 'image' => 'img', 'target_chars' => [] }
      result = described_class.from_h(hash)
      expect(result.char_positions).to eq([])
    end
  end
end

RSpec.describe CaptchaX::ClickVerifyResult do
  describe '#initialize' do
    it 'creates with all attributes' do
      result = described_class.new(success: true, score: 0.95, message: 'Perfect')
      expect(result.success).to eq(true)
      expect(result.score).to eq(0.95)
      expect(result.message).to eq('Perfect')
    end
  end

  describe '.from_h' do
    it 'creates from hash' do
      hash = { 'success' => false, 'score' => 0.5, 'message' => 'Invalid' }
      result = described_class.from_h(hash)
      expect(result.success).to eq(false)
      expect(result.score).to eq(0.5)
      expect(result.message).to eq('Invalid')
    end
  end
end

RSpec.describe CaptchaX::PuzzleCaptchaResult do
  describe '#initialize' do
    it 'creates with all attributes' do
      result = described_class.new(
        id: 'puzzle-123',
        background_b64: 'bg',
        puzzle_b64: 'puzzle',
        target_x: 150,
        target_y: 75
      )
      expect(result.id).to eq('puzzle-123')
      expect(result.background_b64).to eq('bg')
      expect(result.puzzle_b64).to eq('puzzle')
      expect(result.target_x).to eq(150)
      expect(result.target_y).to eq(75)
    end
  end

  describe '.from_h' do
    it 'creates from hash' do
      hash = {
        'id' => 'puzzle-456',
        'background_b64' => 'background',
        'puzzle_b64' => 'puzzle',
        'target_x' => 250,
        'target_y' => 125
      }
      result = described_class.from_h(hash)
      expect(result.id).to eq('puzzle-456')
      expect(result.target_x).to eq(250)
    end
  end
end

RSpec.describe CaptchaX::PuzzleVerifyResult do
  describe '#initialize' do
    it 'creates with success and message' do
      result = described_class.new(success: true, message: 'Puzzle solved')
      expect(result.success).to eq(true)
      expect(result.message).to eq('Puzzle solved')
    end
  end

  describe '.from_h' do
    it 'creates from hash' do
      hash = { 'success' => true, 'message' => 'OK' }
      result = described_class.from_h(hash)
      expect(result.success).to eq(true)
    end
  end
end

RSpec.describe CaptchaX::Scenario do
  describe '#initialize' do
    it 'creates with all attributes' do
      scenario = described_class.new(
        id: 'scenario-123',
        name: 'Test Scenario',
        description: 'Test description',
        difficulty: 'medium',
        config: { size: 'large' },
        created_at: '2024-01-01',
        updated_at: '2024-01-02'
      )
      expect(scenario.id).to eq('scenario-123')
      expect(scenario.name).to eq('Test Scenario')
      expect(scenario.description).to eq('Test description')
      expect(scenario.difficulty).to eq('medium')
      expect(scenario.config).to eq({ size: 'large' })
      expect(scenario.created_at).to eq('2024-01-01')
      expect(scenario.updated_at).to eq('2024-01-02')
    end
  end

  describe '#to_h' do
    it 'converts to hash with name' do
      scenario = described_class.new(name: 'Test')
      hash = scenario.to_h
      expect(hash['name']).to eq('Test')
      expect(hash['description']).to be_nil
    end

    it 'includes optional fields when present' do
      scenario = described_class.new(
        name: 'Test',
        description: 'Desc',
        difficulty: 'hard',
        config: { key: 'value' }
      )
      hash = scenario.to_h
      expect(hash['name']).to eq('Test')
      expect(hash['description']).to eq('Desc')
      expect(hash['difficulty']).to eq('hard')
      expect(hash['config']).to eq({ key: 'value' })
    end
  end

  describe '.from_h' do
    it 'creates from hash' do
      hash = {
        'id' => 'scenario-789',
        'name' => 'API Scenario',
        'description' => 'From API',
        'difficulty' => 'easy',
        'config' => {},
        'created_at' => '2024-01-01',
        'updated_at' => '2024-01-02'
      }
      scenario = described_class.from_h(hash)
      expect(scenario.id).to eq('scenario-789')
      expect(scenario.name).to eq('API Scenario')
      expect(scenario.difficulty).to eq('easy')
    end
  end
end

RSpec.describe CaptchaX::Webhook do
  describe '#initialize' do
    it 'creates with all attributes' do
      webhook = described_class.new(
        id: 'webhook-123',
        app_id: 'app-456',
        url: 'https://example.com/webhook',
        secret: 'secret123',
        events: %w[verify.success verify.fail],
        headers: { 'Authorization' => 'Bearer token' },
        enabled: true,
        created_at: '2024-01-01',
        updated_at: '2024-01-02'
      )
      expect(webhook.id).to eq('webhook-123')
      expect(webhook.app_id).to eq('app-456')
      expect(webhook.url).to eq('https://example.com/webhook')
      expect(webhook.secret).to eq('secret123')
      expect(webhook.events).to eq(%w[verify.success verify.fail])
      expect(webhook.headers).to eq({ 'Authorization' => 'Bearer token' })
      expect(webhook.enabled).to eq(true)
    end

    it 'defaults to enabled true' do
      webhook = described_class.new(url: 'https://example.com/hook', events: [])
      expect(webhook.enabled).to eq(true)
    end

    it 'defaults events to empty array' do
      webhook = described_class.new
      expect(webhook.events).to eq([])
    end
  end

  describe '#to_h' do
    it 'converts to hash' do
      webhook = described_class.new(
        url: 'https://example.com/webhook',
        events: ['verify.success'],
        enabled: true
      )
      hash = webhook.to_h
      expect(hash['url']).to eq('https://example.com/webhook')
      expect(hash['events']).to eq(['verify.success'])
      expect(hash['enabled']).to eq(true)
      expect(hash['secret']).to be_nil
      expect(hash['headers']).to be_nil
    end

    it 'includes optional fields when present' do
      webhook = described_class.new(
        url: 'https://example.com/webhook',
        events: ['verify.success'],
        secret: 'secret',
        headers: { 'X-Custom' => 'header' },
        enabled: false
      )
      hash = webhook.to_h
      expect(hash['secret']).to eq('secret')
      expect(hash['headers']).to eq({ 'X-Custom' => 'header' })
      expect(hash['enabled']).to eq(false)
    end
  end

  describe '.from_h' do
    it 'creates from hash' do
      hash = {
        'id' => 'webhook-789',
        'app_id' => 'app-123',
        'url' => 'https://example.com/hook',
        'events' => %w[verify.success verify.fail],
        'enabled' => true,
        'created_at' => '2024-01-01'
      }
      webhook = described_class.from_h(hash)
      expect(webhook.id).to eq('webhook-789')
      expect(webhook.app_id).to eq('app-123')
      expect(webhook.url).to eq('https://example.com/hook')
      expect(webhook.events).to eq(%w[verify.success verify.fail])
      expect(webhook.enabled).to eq(true)
    end

    it 'defaults enabled to true' do
      webhook = described_class.from_h({ 'url' => 'https://example.com', 'events' => [] })
      expect(webhook.enabled).to eq(true)
    end
  end
end

RSpec.describe CaptchaX::BatchVerifyItem do
  describe '#initialize' do
    it 'creates with required captcha_id and type' do
      item = described_class.new(captcha_id: 'captcha-123', type: 'slider')
      expect(item.captcha_id).to eq('captcha-123')
      expect(item.type).to eq('slider')
      expect(item.target_x).to be_nil
      expect(item.target_y).to be_nil
      expect(item.clicks).to be_nil
    end

    it 'creates with all attributes' do
      clicks = [CaptchaX::CharPosition.new(char: 'A', x: 100, y: 50)]
      item = described_class.new(
        captcha_id: 'captcha-456',
        type: 'click',
        target_x: 100,
        target_y: 50,
        clicks: clicks
      )
      expect(item.target_x).to eq(100)
      expect(item.target_y).to eq(50)
      expect(item.clicks).to eq(clicks)
    end
  end

  describe '#to_h' do
    it 'converts to hash with required fields' do
      item = described_class.new(captcha_id: 'captcha-123', type: 'slider')
      hash = item.to_h
      expect(hash['captcha_id']).to eq('captcha-123')
      expect(hash['type']).to eq('slider')
      expect(hash['target_x']).to be_nil
      expect(hash['clicks']).to be_nil
    end

    it 'includes optional fields when present' do
      item = described_class.new(
        captcha_id: 'captcha-789',
        type: 'slider',
        target_x: 200,
        target_y: 100
      )
      hash = item.to_h
      expect(hash['target_x']).to eq(200)
      expect(hash['target_y']).to eq(100)
    end

    it 'converts clicks to array of hashes' do
      clicks = [CaptchaX::CharPosition.new(char: 'B', x: 300, y: 150)]
      item = described_class.new(captcha_id: 'captcha-abc', type: 'click', clicks: clicks)
      hash = item.to_h
      expect(hash['clicks']).to eq([{ 'char' => 'B', 'x' => 300, 'y' => 150 }])
    end
  end

  describe '.from_h' do
    it 'creates from hash' do
      hash = {
        'captcha_id' => 'captcha-xyz',
        'type' => 'puzzle',
        'target_x' => 150,
        'target_y' => 75
      }
      item = described_class.from_h(hash)
      expect(item.captcha_id).to eq('captcha-xyz')
      expect(item.type).to eq('puzzle')
      expect(item.target_x).to eq(150)
    end

    it 'converts click positions from hash' do
      hash = {
        'captcha_id' => 'captcha-click',
        'type' => 'click',
        'clicks' => [
          { 'char' => 'C', 'x' => 400, 'y' => 200 }
        ]
      }
      item = described_class.from_h(hash)
      expect(item.clicks.first).to be_a(CaptchaX::CharPosition)
      expect(item.clicks.first.char).to eq('C')
    end
  end
end

RSpec.describe CaptchaX::BatchVerifyResult do
  describe '#initialize' do
    it 'creates with required fields' do
      result = described_class.new(captcha_id: 'captcha-123', success: true)
      expect(result.captcha_id).to eq('captcha-123')
      expect(result.success).to eq(true)
      expect(result.message).to be_nil
      expect(result.score).to be_nil
    end

    it 'creates with all fields' do
      result = described_class.new(
        captcha_id: 'captcha-456',
        success: false,
        message: 'Invalid position',
        score: 0.3
      )
      expect(result.message).to eq('Invalid position')
      expect(result.score).to eq(0.3)
    end
  end

  describe '.from_h' do
    it 'creates from hash' do
      hash = {
        'captcha_id' => 'captcha-789',
        'success' => true,
        'message' => 'OK',
        'score' => 1.0
      }
      result = described_class.from_h(hash)
      expect(result.captcha_id).to eq('captcha-789')
      expect(result.success).to eq(true)
      expect(result.message).to eq('OK')
      expect(result.score).to eq(1.0)
    end
  end
end

RSpec.describe CaptchaX::BatchVerifySummary do
  describe '#initialize' do
    it 'creates with all fields' do
      summary = described_class.new(total: 10, success: 7, failed: 2, skipped: 1)
      expect(summary.total).to eq(10)
      expect(summary.success).to eq(7)
      expect(summary.failed).to eq(2)
      expect(summary.skipped).to eq(1)
    end
  end

  describe '.from_h' do
    it 'creates from hash' do
      hash = { 'total' => 20, 'success' => 15, 'failed' => 4, 'skipped' => 1 }
      summary = described_class.from_h(hash)
      expect(summary.total).to eq(20)
      expect(summary.success).to eq(15)
      expect(summary.failed).to eq(4)
      expect(summary.skipped).to eq(1)
    end
  end
end

RSpec.describe CaptchaX::BatchVerifyResponse do
  describe '#initialize' do
    it 'creates with results and summary' do
      results = [CaptchaX::BatchVerifyResult.new(captcha_id: 'c1', success: true)]
      summary = CaptchaX::BatchVerifySummary.new(total: 1, success: 1, failed: 0, skipped: 0)
      response = described_class.new(results: results, summary: summary)
      expect(response.results).to eq(results)
      expect(response.summary).to eq(summary)
    end
  end

  describe '.from_h' do
    it 'creates from hash' do
      hash = {
        'results' => [
          { 'captcha_id' => 'c1', 'success' => true },
          { 'captcha_id' => 'c2', 'success' => false }
        ],
        'summary' => { 'total' => 2, 'success' => 1, 'failed' => 1, 'skipped' => 0 }
      }
      response = described_class.from_h(hash)
      expect(response.results.length).to eq(2)
      expect(response.results.first).to be_a(CaptchaX::BatchVerifyResult)
      expect(response.summary).to be_a(CaptchaX::BatchVerifySummary)
    end

    it 'handles empty results' do
      hash = { 'results' => [], 'summary' => { 'total' => 0, 'success' => 0, 'failed' => 0, 'skipped' => 0 } }
      response = described_class.from_h(hash)
      expect(response.results).to eq([])
    end
  end
end

RSpec.describe CaptchaX::HealthStatus do
  describe '#initialize' do
    it 'creates with status' do
      status = described_class.new(status: 'healthy')
      expect(status.status).to eq('healthy')
      expect(status.service).to be_nil
      expect(status.timestamp).to be_nil
      expect(status.version).to be_nil
    end

    it 'creates with all attributes' do
      status = described_class.new(
        status: 'healthy',
        service: 'captchax',
        timestamp: '2024-01-01T00:00:00Z',
        version: '1.0.0'
      )
      expect(status.status).to eq('healthy')
      expect(status.service).to eq('captchax')
      expect(status.timestamp).to eq('2024-01-01T00:00:00Z')
      expect(status.version).to eq('1.0.0')
    end
  end

  describe '.from_h' do
    it 'creates from hash' do
      hash = {
        'status' => 'unhealthy',
        'service' => 'captchax-api',
        'timestamp' => '2024-01-02T00:00:00Z',
        'version' => '2.0.0'
      }
      status = described_class.from_h(hash)
      expect(status.status).to eq('unhealthy')
      expect(status.service).to eq('captchax-api')
      expect(status.version).to eq('2.0.0')
    end
  end
end
