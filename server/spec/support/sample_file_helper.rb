
module SampleFileHelper
  SampleFileRoot = File.expand_path("../../sample_json", __FILE__)

  def read_sample_file(filename)
    return File.read(File.join(SampleFileRoot,filename))
  end

  def stub_endpoint_with_file(endpoint,filename)
    stub_request(:any, endpoint).to_return(:body => read_sample_file(filename), :status => 200)
  end

end

RSpec.configure do |config|
  config.include SampleFileHelper
end