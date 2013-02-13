require 'spec_helper'

describe Parsers::Base do
  let(:uri )      {"http://mockserver.nowhere/foo.json"} 
  let(:json)      {"{\"one\":1,\"two\":2}"             }
  let(:data_hash) { {'from_import' => true, 'one'=> 1,'two'=> 2}              }  

  describe "#initialize" do
    context "without a nil uri spec" do
      subject { Parsers::Base.new(nil) }
      its(:uri_helper) { should be_nil }
    end
    
    context "with a uri" do
      subject { Parsers::Base.new(uri) }
      its(:uri_helper) { should be_kind_of UriHelper::Base }
    end

    context "with initial data" do
      let(:json)      { "{\"one\":1,\"two\":2}"     }
      let(:data_hash) {  {'from_import' => true, 'one' => 1, 'two' => 2}   }
      
      context "from a hash" do
        subject { Parsers::Base.new(nil,data_hash) }
        its(:data_hash) { should == data_hash }
      end

      context "from json" do
        subject { Parsers::Base.new(nil,json) }
        its(:data_hash) { should == data_hash }
      end
    end

  end

  describe "#update_from_hash!" do
    context "with an empty data_hash" do
      subject { Parsers::Base.new().update_from_hash!(data_hash)}
      its(:data_hash) { should == data_hash }
    end

    context "with existing data" do
      let(:existing_data) { {'something_else' => true, 'two' => 3 } }
      subject do 
        Parsers::Base.new(nil,existing_data).
        update_from_hash!(data_hash)
      end
      its(:data_hash) { should have_key 'something_else' }
      its(:data_hash) { should have_key 'one'            }
      it "overrides old data with new data" do
        subject.data_hash['two'].should == 2
      end
    end
  end

  describe "#update_from_json!" do    
    context "with an empty data_hash" do
      subject { Parsers::Base.new().update_from_json!(json)}
      its(:data_hash) { should == data_hash }
    end

  end
  
  describe "#update_from_uri!" do
    subject { Parsers::Base.new(uri).update_from_uri!}
    before :each do
      stub_endpoint_with_data(uri,json)
    end
    its(:data_hash){ should == data_hash }
  end

  describe "#parse" do
    pending
  end    

  describe "#migrate" do
    pending
  end

  describe "#parse_collection" do
    let(:label) { 'models' }
    let(:collection)      { [] }
    let(:initial_data) do 
      {'models' => [
        {
          'name' => 'first',
          'number' => 1 
        },
        {
          'name' => 'second',
          'number' => 2
        }
      ]}
    end
    subject do 
      collection = []
      Parsers::Base.new.
        update_from_hash!(initial_data).
        parse_collection(label,collection, Parsers::Base)
      collection
    end
    it { should_not be_nil       }
    it { should have(2).entries  }
    it { should be_kind_of Enumerable }
  end


end
