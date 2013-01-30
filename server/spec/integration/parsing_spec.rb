require 'spec_helper'

describe "Round Trip parsing" do

  describe "parsing a known interactive" do
    let(:interactive_file){ "interactives/basic-examples/one-atom.json" }
    let(:interactive_path){ sample_file_path interactive_file }
    let(:model_file) { "models/md2d/one-atom.json"}
    let(:interactive_hash){ JSON.parse(read_sample_file interactive_file) }
    let(:model_hash)      { JSON.parse(read_sample_file model_file) }

    it "should have matching interactive hash" do
      interactive = Parsers::Interactive.new(interactive_path).parse()
      presenter   = Presenters::Interactive.new(interactive)
      interactive_hash['models'].each do |m|
        m['url'].sub!("models/md2d","http://localhost:3000/md2d_models")
      end
      presenter.runtime_properties.should == interactive_hash
    end

    it "should have matchign models hashes" do
      interactive = Parsers::Interactive.new(interactive_path).parse()
      interactive.md_2d_models.each do |m|
        presenter   = Presenters::Md2dModel.new(m)
        binding.pry
        presenter.runtime_properties.should == model_hash
      end
    end
  end

end