require 'spec_helper'
require 'captchax'

RSpec.describe 'CaptchaX Integration Tests' do
  describe 'CaptchaX factory method' do
    it 'creates client with development environment config' do
      dev_client = CaptchaX.new(
        base_url: 'http://localhost:3000',
        app_id: 'dev-app',
        timeout: 5_000,
        retry_times: 1
      )

      expect(dev_client).to be_a(CaptchaX::Client)
      config = dev_client.instance_variable_get(:@config)
      expect(config[:base_url]).to eq('http://localhost:3000')
      expect(config[:app_id]).to eq('dev-app')
      expect(config[:timeout]).to eq(5_000)
      expect(config[:retry_times]).to eq(1)
    end

    it 'creates client with production environment config' do
      prod_client = CaptchaX.new(
        base_url: 'https://captchax.example.com',
        app_id: 'prod-app',
        timeout: 30_000,
        retry_times: 5,
        api_version: :v2
      )

      expect(prod_client).to be_a(CaptchaX::Client)
      config = prod_client.instance_variable_get(:@config)
      expect(config[:base_url]).to eq('https://captchax.example.com')
      expect(config[:app_id]).to eq('prod-app')
      expect(config[:timeout]).to eq(30_000)
      expect(config[:retry_times]).to eq(5)
      expect(config[:api_version]).to eq(:v2)
    end

    it 'uses default values when not provided' do
      default_client = CaptchaX.new(base_url: 'https://api.example.com')
      config = default_client.instance_variable_get(:@config)

      expect(config[:timeout]).to eq(10_000)
      expect(config[:retry_times]).to eq(3)
      expect(config[:api_version]).to eq(:v1)
      expect(config[:app_id]).to be_nil
    end
  end

  describe 'Slider Captcha Workflow' do
    let(:client) { CaptchaX.new(base_url: 'https://captchax.example.com', app_id: 'test-app') }

    it 'generates and verifies slider captcha' do
      captcha_id = 'slider-test-123'
      target_distance = 0.95

      stub_request(:post, 'https://captchax.example.com/v1/captcha/slider')
        .with(body: hash_including('scenario_id' => 'login-scenario'))
        .to_return(
          status: 200,
          body: {
            code: 0,
            message: 'success',
            data: {
              id: captcha_id,
              background_b64: 'background_image_base64',
              slider_b64: 'slider_image_base64',
              target_x: 200,
              target_y: 100
            }
          }.to_json
        )

      captcha_result = client.generate_slider_captcha(scenario_id: 'login-scenario')
      expect(captcha_result[:id]).to eq(captcha_id)
      expect(captcha_result[:target_x]).to eq(200)

      stub_request(:post, 'https://captchax.example.com/v1/captcha/slider/verify')
        .with(body: { 'captcha_id' => captcha_id, 'distance' => target_distance })
        .to_return(
          status: 200,
          body: {
            code: 0,
            message: 'success',
            data: {
              success: true,
              message: 'Verification passed'
            }
          }.to_json
        )

      verify_result = client.verify_slider_captcha(captcha_id: captcha_id, distance: target_distance)
      expect(verify_result[:success]).to be true
      expect(verify_result[:message]).to eq('Verification passed')
    end
  end

  describe 'Click Captcha Workflow' do
    let(:client) { CaptchaX.new(base_url: 'https://captchax.example.com', app_id: 'test-app') }

    it 'generates and verifies click captcha' do
      captcha_id = 'click-test-456'
      click_positions = [
        CaptchaX::CharPosition.new(char: 'A', x: 100, y: 50),
        CaptchaX::CharPosition.new(char: 'B', x: 200, y: 150)
      ]

      stub_request(:post, 'https://captchax.example.com/v1/captcha/click')
        .with(body: hash_including('scenario_id' => 'signup-scenario'))
        .to_return(
          status: 200,
          body: {
            code: 0,
            message: 'success',
            data: {
              id: captcha_id,
              image: 'click_image_base64',
              target_chars: %w[A B],
              char_positions: [
                { 'char' => 'A', 'x' => 100, 'y' => 50 },
                { 'char' => 'B', 'x' => 200, 'y' => 150 },
                { 'char' => 'C', 'x' => 300, 'y' => 250 }
              ]
            }
          }.to_json
        )

      captcha_result = client.generate_click_captcha(scenario_id: 'signup-scenario')
      expect(captcha_result[:id]).to eq(captcha_id)
      expect(captcha_result[:target_chars]).to eq(%w[A B])
      expect(captcha_result[:char_positions].length).to eq(3)

      stub_request(:post, 'https://captchax.example.com/v1/captcha/click/verify')
        .to_return(
          status: 200,
          body: {
            code: 0,
            message: 'success',
            data: {
              success: true,
              score: 0.98,
              message: 'Perfect match'
            }
          }.to_json
        )

      verify_result = client.verify_click_captcha(captcha_id: captcha_id, clicks: click_positions)
      expect(verify_result[:success]).to be true
      expect(verify_result[:score]).to eq(0.98)
    end
  end

  describe 'Puzzle Captcha Workflow' do
    let(:client) { CaptchaX.new(base_url: 'https://captchax.example.com', app_id: 'test-app') }

    it 'generates and verifies puzzle captcha' do
      captcha_id = 'puzzle-test-789'
      target_distance = 0.98

      stub_request(:post, 'https://captchax.example.com/v1/captcha/puzzle')
        .to_return(
          status: 200,
          body: {
            code: 0,
            message: 'success',
            data: {
              id: captcha_id,
              background_b64: 'puzzle_background_base64',
              puzzle_b64: 'puzzle_piece_base64',
              target_x: 150,
              target_y: 75
            }
          }.to_json
        )

      captcha_result = client.generate_puzzle_captcha
      expect(captcha_result[:id]).to eq(captcha_id)
      expect(captcha_result[:target_x]).to eq(150)
      expect(captcha_result[:target_y]).to eq(75)

      stub_request(:post, 'https://captchax.example.com/v1/captcha/puzzle/verify')
        .with(body: { 'captcha_id' => captcha_id, 'distance' => target_distance })
        .to_return(
          status: 200,
          body: {
            code: 0,
            message: 'success',
            data: {
              success: true,
              message: 'Puzzle solved'
            }
          }.to_json
        )

      verify_result = client.verify_puzzle_captcha(captcha_id: captcha_id, distance: target_distance)
      expect(verify_result[:success]).to be true
    end
  end

  describe 'Scenario Management Workflow' do
    let(:client) { CaptchaX.new(base_url: 'https://captchax.example.com', app_id: 'test-app') }

    it 'creates, lists, updates, and deletes scenarios' do
      new_scenario_id = 'new-scenario-123'

      stub_request(:post, 'https://captchax.example.com/v1/scenarios')
        .to_return(
          status: 200,
          body: {
            code: 0,
            message: 'success',
            data: {
              id: new_scenario_id,
              name: 'Test Scenario',
              description: 'Created via SDK',
              difficulty: 'medium',
              config: { timeout: 60 },
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            }
          }.to_json
        )

      created = client.create_scenario(
        name: 'Test Scenario',
        description: 'Created via SDK',
        difficulty: 'medium',
        config: { timeout: 60 }
      )
      expect(created[:id]).to eq(new_scenario_id)
      expect(created[:name]).to eq('Test Scenario')

      stub_request(:get, 'https://captchax.example.com/v1/scenarios')
        .to_return(
          status: 200,
          body: {
            code: 0,
            message: 'success',
            data: [
              { id: new_scenario_id, name: 'Test Scenario' },
              { id: 'existing-scenario', name: 'Existing' }
            ]
          }.to_json
        )

      scenarios = client.list_scenarios
      expect(scenarios.length).to eq(2)
      expect(scenarios.map { |s| s[:name] }).to include('Test Scenario')

      stub_request(:put, 'https://captchax.example.com/v1/scenarios/new-scenario-123')
        .with(body: { 'name' => 'Updated Scenario', 'difficulty' => 'hard' })
        .to_return(
          status: 200,
          body: {
            code: 0,
            message: 'success',
            data: {
              id: new_scenario_id,
              name: 'Updated Scenario',
              difficulty: 'hard',
              updated_at: '2024-01-02T00:00:00Z'
            }
          }.to_json
        )

      updated = client.update_scenario(
        scenario_id: new_scenario_id,
        name: 'Updated Scenario',
        difficulty: 'hard'
      )
      expect(updated[:name]).to eq('Updated Scenario')
      expect(updated[:difficulty]).to eq('hard')

      stub_request(:delete, 'https://captchax.example.com/v1/scenarios/new-scenario-123')
        .to_return(
          status: 200,
          body: { code: 0, message: 'success', data: nil }.to_json
        )

      deleted = client.delete_scenario(new_scenario_id)
      expect(deleted).to be true
    end
  end

  describe 'Webhook Management Workflow' do
    let(:client) { CaptchaX.new(base_url: 'https://captchax.example.com', app_id: 'test-app') }

    it 'creates, lists, updates, and deletes webhooks' do
      new_webhook_id = 'new-webhook-456'
      webhook_url = 'https://example.com/webhook/captchas'

      stub_request(:post, 'https://captchax.example.com/v1/webhooks')
        .to_return(
          status: 200,
          body: {
            code: 0,
            message: 'success',
            data: {
              id: new_webhook_id,
              app_id: 'test-app',
              url: webhook_url,
              events: %w[verify.success verify.fail captcha.expired],
              secret: 'webhook_secret_123',
              enabled: true,
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            }
          }.to_json
        )

      created = client.create_webhook(
        url: webhook_url,
        events: %w[verify.success verify.fail captcha.expired],
        secret: 'webhook_secret_123'
      )
      expect(created[:id]).to eq(new_webhook_id)
      expect(created[:url]).to eq(webhook_url)
      expect(created[:events]).to eq(%w[verify.success verify.fail captcha.expired])

      stub_request(:get, 'https://captchax.example.com/v1/webhooks')
        .to_return(
          status: 200,
          body: {
            code: 0,
            message: 'success',
            data: [
              { id: new_webhook_id, url: webhook_url, enabled: true }
            ]
          }.to_json
        )

      webhooks = client.list_webhooks
      expect(webhooks.length).to eq(1)
      expect(webhooks.first[:url]).to eq(webhook_url)

      stub_request(:get, 'https://captchax.example.com/v1/webhooks/new-webhook-456')
        .to_return(
          status: 200,
          body: {
            code: 0,
            message: 'success',
            data: {
              id: new_webhook_id,
              url: webhook_url,
              events: %w[verify.success],
              enabled: true
            }
          }.to_json
        )

      webhook = client.get_webhook(new_webhook_id)
      expect(webhook[:id]).to eq(new_webhook_id)

      stub_request(:put, 'https://captchax.example.com/v1/webhooks/new-webhook-456')
        .with(body: { 'enabled' => false })
        .to_return(
          status: 200,
          body: {
            code: 0,
            message: 'success',
            data: {
              id: new_webhook_id,
              enabled: false,
              updated_at: '2024-01-02T00:00:00Z'
            }
          }.to_json
        )

      disabled = client.update_webhook(webhook_id: new_webhook_id, enabled: false)
      expect(disabled[:enabled]).to be false

      stub_request(:delete, 'https://captchax.example.com/v1/webhooks/new-webhook-456')
        .to_return(
          status: 200,
          body: { code: 0, message: 'success', data: nil }.to_json
        )

      deleted = client.delete_webhook(new_webhook_id)
      expect(deleted).to be true
    end
  end

  describe 'Batch Verification Workflow' do
    let(:client) { CaptchaX.new(base_url: 'https://captchax.example.com', app_id: 'test-app') }

    it 'verifies multiple captchas in batch' do
      items = [
        CaptchaX::BatchVerifyItem.new(
          captcha_id: 'slider-1',
          type: 'slider',
          target_x: 200,
          target_y: 100
        ),
        CaptchaX::BatchVerifyItem.new(
          captcha_id: 'puzzle-2',
          type: 'puzzle',
          target_x: 150,
          target_y: 75
        ),
        CaptchaX::BatchVerifyItem.new(
          captcha_id: 'click-3',
          type: 'click',
          clicks: [
            CaptchaX::CharPosition.new(char: 'A', x: 100, y: 50),
            CaptchaX::CharPosition.new(char: 'B', x: 200, y: 150)
          ]
        )
      ]

      stub_request(:post, 'https://captchax.example.com/v1/captcha/batch/verify')
        .to_return(
          status: 200,
          body: {
            code: 0,
            message: 'success',
            data: {
              results: [
                { captcha_id: 'slider-1', success: true, message: 'OK' },
                { captcha_id: 'puzzle-2', success: true, message: 'OK' },
                { captcha_id: 'click-3', success: false, message: 'Invalid positions', score: 0.3 }
              ],
              summary: {
                total: 3,
                success: 2,
                failed: 1,
                skipped: 0
              }
            }
          }.to_json
        )

      result = client.batch_verify(items: items)

      expect(result[:summary][:total]).to eq(3)
      expect(result[:summary][:success]).to eq(2)
      expect(result[:summary][:failed]).to eq(1)
      expect(result[:results].length).to eq(3)

      slider_result = result[:results].find { |r| r[:captcha_id] == 'slider-1' }
      expect(slider_result[:success]).to be true

      click_result = result[:results].find { |r| r[:captcha_id] == 'click-3' }
      expect(click_result[:success]).to be false
      expect(click_result[:score]).to eq(0.3)
    end
  end

  describe 'Error Handling Integration' do
    let(:client) { CaptchaX.new(base_url: 'https://captchax.example.com', app_id: 'test-app', retry_times: 2) }

    it 'handles network timeout gracefully' do
      stub_request(:post, 'https://captchax.example.com/v1/captcha/slider')
        .to_raise(Faraday::TimeoutError.new('Connection timeout'))

      expect { client.generate_slider_captcha }.to raise_error(CaptchaX::TimeoutError)
    end

    it 'handles connection failure gracefully' do
      stub_request(:post, 'https://captchax.example.com/v1/captcha/slider')
        .to_raise(Faraday::ConnectionFailed.new('Connection refused'))

      expect { client.generate_slider_captcha }.to raise_error(CaptchaX::TimeoutError)
    end

    it 'handles API errors with retry' do
      counter = 0
      stub_request(:post, 'https://captchax.example.com/v1/captcha/slider')
        .to_return do
          counter += 1
          if counter == 1
            { status: 503, body: 'Service Unavailable' }
          else
            {
              status: 200,
              body: {
                code: 0,
                message: 'success',
                data: { id: 'captcha-after-retry' }
              }
            }.to_json
          end
        end

      result = client.generate_slider_captcha
      expect(result[:id]).to eq('captcha-after-retry')
      expect(counter).to eq(2)
    end

    it 'handles non-retryable API errors immediately' do
      stub_request(:post, 'https://captchax.example.com/v1/captcha/slider')
        .to_return(
          status: 400,
          body: { code: 1001, message: 'Invalid scenario_id' }.to_json
        )

      expect { client.generate_slider_captcha(scenario_id: 'invalid') }.to raise_error(CaptchaX::ApiError) do |error|
        expect(error.code).to eq(1001)
        expect(error.http_status).to eq(400)
      end
    end

    it 'handles 404 not found errors' do
      stub_request(:get, 'https://captchax.example.com/v1/scenarios/nonexistent')
        .to_return(
          status: 404,
          body: { code: 1004, message: 'Scenario not found' }.to_json
        )

      expect { client.get_scenario('nonexistent') }.to raise_error(CaptchaX::ApiError) do |error|
        expect(error.http_status).to eq(404)
      end
    end
  end

  describe 'Health Check Integration' do
    it 'checks health in development environment' do
      dev_client = CaptchaX.new(
        base_url: 'http://localhost:3000',
        app_id: 'dev-app'
      )

      stub_request(:get, 'http://localhost:3000/v1/health')
        .to_return(
          status: 200,
          body: {
            code: 0,
            message: 'success',
            data: {
              status: 'healthy',
              service: 'captchax-dev',
              timestamp: '2024-01-01T00:00:00Z',
              version: '1.0.0'
            }
          }.to_json
        )

      result = dev_client.health_check
      expect(result[:status]).to eq('healthy')
      expect(result[:service]).to eq('captchax-dev')
    end

    it 'checks health in production environment' do
      prod_client = CaptchaX.new(
        base_url: 'https://captchax.example.com',
        app_id: 'prod-app'
      )

      stub_request(:get, 'https://captchax.example.com/v1/health')
        .to_return(
          status: 200,
          body: {
            code: 0,
            message: 'success',
            data: {
              status: 'healthy',
              service: 'captchax-prod',
              timestamp: '2024-01-01T00:00:00Z',
              version: '2.1.0'
            }
          }.to_json
        )

      result = prod_client.health_check
      expect(result[:status]).to eq('healthy')
      expect(result[:version]).to eq('2.1.0')
    end
  end
end
