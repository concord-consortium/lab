require 'spec_helper'

describe Parsers::Interactive do
  # let(:meta_data_file) {"one_atom_meta.json"}
  # let(:json_file)      {"one_atom.json"}

  # let(:meta_data){ JSON.parse(read_sample_file meta_data_file) }
  # let(:good_data){ JSON.parse(read_sample_file json_file)      }

  # describe "#parse(hash)" do
  #   describe "parsing the meta_data" do
  #     context "using a good definition file" do
  #       subject { Interactive.new(sample_root).parse(meta_data) }
  #       it      { should_not be_nil }
  #       it      { should be_valid   }
  #     end
  #   end
  # end


  # TODO: this is a kind of integration test, move it
  describe "parsing a known interactive" do
    let(:interactive_file){ "interactives/basic-examples/one-atom.json" }
    let(:interactive_path){ sample_file_path interactive_file }

    let(:interactive_hash){ JSON.parse(read_sample_file interactive_file) }
    let(:model_hash)      { JSON.parse(read_sample_file) }

    it "should have matching interactive hash" do
      interactive_path.should_not be_nil
      interactive_hash.should_not be_nil
      interactive = Parsers::Interactive.new(interactive_path).parse()
      presenter   = Presenters::Interactive.new(interactive)
      interactive_hash['models'].each do |i|
        i['url'].sub!("models/md2d","http://localhost:3000/md2d_models")
      end
      presenter.runtime_properties.should == interactive_hash
    end
  end

end