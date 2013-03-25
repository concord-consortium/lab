# This file is copied to spec/ when you run 'rails generate rspec:install'
ENV["RAILS_ENV"] ||= 'test'
require File.expand_path("../../config/environment", __FILE__)
require 'rspec/rails'
require 'rspec/autorun'
require 'webmock/rspec'


# by default, all web connections are disabled.
WebMock.disable_net_connect!(:allow_localhost => true)

# Requires supporting ruby files with custom matchers and macros, etc,
# in spec/support/ and its subdirectories.
Dir[Rails.root.join("spec/support/**/*.rb")].each {|f| require f}

TEST_CONFIG = YAML.load_file("#{Rails.root}/config/couchdb.yml")["test"]
COUCHHOST = "#{TEST_CONFIG['protocol']}://#{TEST_CONFIG['host']}:#{TEST_CONFIG['port']}"
TESTDB    = "#{TEST_CONFIG['prefix']}_#{TEST_CONFIG['suffix']}"
TEST_SERVER = CouchRest.new(COUCHHOST)
TEST_SERVER.default_database = TESTDB
DB = TEST_SERVER.database(TESTDB)

RSpec.configure do |config|

  config.include FactoryGirl::Syntax::Methods

  config.before(:each) { reset_test_db! }

  config.after(:each) do
    cr = TEST_SERVER
    test_dbs = cr.databases.select { |db| db =~ /^#{TESTDB}/ }
    test_dbs.each do |db|
      cr.database(db).delete! rescue nil
    end
  end

  # ## Mock Framework
  #
  # If you prefer to use mocha, flexmock or RR, uncomment the appropriate line:
  #
  # config.mock_with :mocha
  # config.mock_with :flexmock
  # config.mock_with :rr

  # Remove this line if you're not using ActiveRecord or ActiveRecord fixtures
  # config.fixture_path = "#{::Rails.root}/spec/fixtures"

  # If you're not using ActiveRecord, or you'd prefer not to run each of your
  # examples within a transaction, remove the following line or assign false
  # instead of true.
  # config.use_transactional_fixtures = true

  # If true, the base class of anonymous controllers will be inferred
  # automatically. This will be the default behavior in future versions of
  # rspec-rails.
  config.infer_base_class_for_anonymous_controllers = false

  # Run specs in random order to surface order dependencies. If you find an
  # order dependency and want to debug it, you can fix the order by providing
  # the seed, which is printed after each run.
  #     --seed 1234
  config.order = "random"
end

def reset_test_db!
  DB.recreate! rescue nil
  # Reset the Design Cache
  Thread.current[:couchrest_design_cache] = {}
  DB
end
