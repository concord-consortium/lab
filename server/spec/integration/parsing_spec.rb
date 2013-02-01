require 'spec_helper'

describe "Round Trip parsing" do

  describe "parsing a known interactive" do
    let(:interactive_file){ "interactives/basic-examples/one-atom.json" }
    let(:interactive_path){ sample_file_path interactive_file }
    let(:model_file) { "models/md2d/one-atom.json"}
    let(:interactive_hash){ JSON.parse(read_sample_file interactive_file) }
    let(:model_raw_hash)  { JSON.parse(read_sample_file model_file) }

    # Merge in the viewOptions for each model spec
    let(:view_options) do 
      interactive_hash['models'][0]['viewOptions']
    end
    let(:model_hash)      do 
      (model_raw_hash['viewOptions'] = view_options) if view_options
      model_raw_hash
    end
  
    it "should have matching interactive hash" do
      interactive = Parsers::Interactive.new(interactive_path).parse()
      presenter   = Presenters::Interactive.new(interactive)
      interactive_hash['models'].each do |m|
        m['url'].sub!("models/md2d","http://localhost:3000/models/md2ds")
      end
      presenter.runtime_properties.should == interactive_hash
    end

    it "should have matchign models hashes" do
      interactive = Parsers::Interactive.new(interactive_path).parse()
      interactive.md2ds.each do |m|
        presenter   = Presenters::Models::Md2d.new(m)
        presenter.runtime_properties.should == model_hash
      end
    end
  end

end