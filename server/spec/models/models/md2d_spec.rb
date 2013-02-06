require 'spec_helper'

describe Models::Md2d do
  let(:float_value) { 1.0 }
  let(:hash_value)  { {"hash" => true        }}
  let(:array_value) { [1,2,3, hash_value ]   }

  let(:viewOptionsHash) do
    {
      "float_value"  => float_value,
      "array_value"  => array_value
    }
  end
  describe "viewOptions" do
    subject do
      subj = Models::Md2d.create('viewOptions' => viewOptionsHash)
      subj = Models::Md2d.find(subj.id)
      subj.viewOptions
    end
    it { should == viewOptionsHash }
    it "should include the arrays nested hash value" do
      subject['array_value'].should == array_value
      subject['array_value'][3].should == hash_value
    end
  end
end