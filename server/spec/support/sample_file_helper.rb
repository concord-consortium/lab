module SampleFileHelper

  def sample_root
    File.expand_path("../../sample_json", __FILE__)
  end

  def sample_file_path(filename)
    File.absolute_path(File.join(sample_root,filename))
  end

  def read_sample_file(filename)
    File.read(self.sample_file_path(filename))
  end

  def stub_endpoint_with_data(endpoint,data)
    stub_request(:any, endpoint).to_return(
      :body => data,
      :status => 200
    )
  end

  def stub_endpoint_with_file(endpoint,filename)
    stub_endpoint_with_data(endpoint,read_sample_file(filename))
  end

end

RSpec.configure do |config|
  config.include SampleFileHelper
end