#!/usr/bin/env ruby
require 'open3'

module TestRunner
  class Runner
    COLORS = {
      green: "\e[32m",
      red: "\e[31m",
      yellow: "\e[33m",
      blue: "\e[34m",
      reset: "\e[0m"
    }.freeze

    def initialize
      @project_root = File.expand_path('..', __dir__)
    end

    def run_all_tests
      puts "#{COLORS[:blue]}========================================#{COLORS[:reset]}"
      puts "#{COLORS[:blue]}  CaptchaX Ruby SDK - Test Suite#{COLORS[:reset]}"
      puts "#{COLORS[:blue]}========================================#{COLORS[:reset]}"
      puts

      run_bundle_install
      run_unit_tests
      run_integration_tests
      generate_coverage_report

      puts
      puts "#{COLORS[:green]}All tests completed!#{COLORS[:reset]}"
    end

    private

    def run_bundle_install
      puts "#{COLORS[:yellow]}Installing dependencies...#{COLORS[:reset]}"
      system("cd #{@project_root} && bundle install --quiet")
      puts
    end

    def run_unit_tests
      puts "#{COLORS[:yellow]}Running unit tests...#{COLORS[:reset]}"
      system("cd #{@project_root} && bundle exec rspec spec/captchax/error_spec.rb spec/captchax/models_spec.rb --format documentation")
      puts
    end

    def run_integration_tests
      puts "#{COLORS[:yellow]}Running integration tests...#{COLORS[:reset]}"
      system("cd #{@project_root} && bundle exec rspec spec/integration_spec.rb --format documentation")
      puts
    end

    def generate_coverage_report
      puts "#{COLORS[:yellow]}Generating coverage report...#{COLORS[:reset]}"
      system("cd #{@project_root} && COVERAGE=true bundle exec rspec")
      puts
      puts "#{COLORS[:green]}Coverage report generated at: #{@project_root}/coverage/index.html#{COLORS[:reset]}"
      puts "#{COLORS[:green]}LCOV report generated at: #{@project_root}/coverage/lcov/lcov.info#{COLORS[:reset]}"
    end
  end
end

if __FILE__ == $0
  TestRunner::Runner.new.run_all_tests
end
