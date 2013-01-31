module DbCleaner
  def self.clean
    BaseDataObject.delete_everything
  end

end

RSpec.configure do |config|
  config.before(:suite) do
    DbCleaner.clean
  end
end