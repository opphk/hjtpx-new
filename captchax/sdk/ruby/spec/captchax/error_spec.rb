require 'spec_helper'
require 'captchax/error'

RSpec.describe CaptchaX::CaptchaXError do
  describe '#initialize' do
    it 'creates error with message and code' do
      error = described_class.new('Test error message', 'TEST_CODE')
      expect(error.message).to eq('Test error message')
      expect(error.code).to eq('TEST_CODE')
    end

    it 'creates error with default code' do
      error = described_class.new('Test error')
      expect(error.code).to be_nil
    end

    it 'is a StandardError' do
      error = described_class.new('Test')
      expect(error).to be_a(StandardError)
    end
  end
end

RSpec.describe CaptchaX::ConfigurationError do
  describe '#initialize' do
    it 'creates configuration error with message' do
      error = described_class.new('Missing base_url')
      expect(error.message).to eq('Missing base_url')
      expect(error.code).to eq('CONFIG_ERROR')
    end

    it 'is a CaptchaXError' do
      error = described_class.new('Config error')
      expect(error).to be_a(CaptchaX::CaptchaXError)
    end
  end
end

RSpec.describe CaptchaX::ApiError do
  describe '#initialize' do
    it 'creates API error with message and HTTP status' do
      error = described_class.new('Bad request', 400, 1001)
      expect(error.message).to eq('Bad request')
      expect(error.http_status).to eq(400)
      expect(error.code).to eq(1001)
    end

    it 'creates API error with default values' do
      error = described_class.new('Network error')
      expect(error.http_status).to be_nil
      expect(error.code).to be_nil
    end

    it 'is a CaptchaXError' do
      error = described_class.new('API error')
      expect(error).to be_a(CaptchaX::CaptchaXError)
    end
  end
end

RSpec.describe CaptchaX::TimeoutError do
  describe '#initialize' do
    it 'creates timeout error with custom message' do
      error = described_class.new('Connection timed out')
      expect(error.message).to eq('Connection timed out')
      expect(error.code).to eq('TIMEOUT')
    end

    it 'creates timeout error with default message' do
      error = described_class.new
      expect(error.message).to eq('Request timed out')
      expect(error.code).to eq('TIMEOUT')
    end

    it 'is a CaptchaXError' do
      error = described_class.new
      expect(error).to be_a(CaptchaX::CaptchaXError)
    end
  end
end

RSpec.describe CaptchaX::RetryExhaustedError do
  describe '#initialize' do
    it 'creates retry error with custom message' do
      error = described_class.new('Max retries reached')
      expect(error.message).to eq('Max retries reached')
      expect(error.code).to eq('RETRY_EXHAUSTED')
    end

    it 'creates retry error with default message' do
      error = described_class.new
      expect(error.message).to eq('Retry attempts exhausted')
      expect(error.code).to eq('RETRY_EXHAUSTED')
    end

    it 'is a CaptchaXError' do
      error = described_class.new
      expect(error).to be_a(CaptchaX::CaptchaXError)
    end
  end
end

RSpec.describe 'CaptchaX Error Classes' do
  it 'has all error classes defined' do
    expect(defined?(CaptchaX::CaptchaXError)).to eq('constant')
    expect(defined?(CaptchaX::ConfigurationError)).to eq('constant')
    expect(defined?(CaptchaX::ApiError)).to eq('constant')
    expect(defined?(CaptchaX::TimeoutError)).to eq('constant')
    expect(defined?(CaptchaX::RetryExhaustedError)).to eq('constant')
  end

  it 'error hierarchy is correct' do
    expect(CaptchaX::CaptchaXError.ancestors).to include(StandardError)
    expect(CaptchaX::ConfigurationError.ancestors).to include(CaptchaX::CaptchaXError)
    expect(CaptchaX::ApiError.ancestors).to include(CaptchaX::CaptchaXError)
    expect(CaptchaX::TimeoutError.ancestors).to include(CaptchaX::CaptchaXError)
    expect(CaptchaX::RetryExhaustedError.ancestors).to include(CaptchaX::CaptchaXError)
  end
end
