require 'spec_helper'


class Subclass < BaseDataObject
  property     :value,    String
  property     :value2,   String
  property     :alt_key,  String
  alternate_id :alt_key
end


describe BaseDataObject do
  before :each do
    DbCleaner.clean
  end

  let(:data_hash) do
    { "id" => "xyzzy", "alt_key" => "plugh", "value" => "bar"}
  end

  let(:instance) { Subclass.create(data_hash) }
  subject { Subclass }


  describe "self.find_matching(hash_def)" do
    context "find with existing id" do
      it "it should search for the item by id" do
        subject.
          should_receive(:find).
          with(data_hash["id"]).
          and_return(instance)
        subject.find_matching(data_hash)
      end
    end

    context "find with alternate_id_key if there is no id match" do
      it "it should search for the item by id" do
        subject.
          should_receive(:find).
          with(data_hash["id"]).
          and_return(nil)
        subject.
          should_receive(:find_by_alt_key).
          with(data_hash["alt_key"]).
          and_return(instance)
        subject.find_matching(data_hash).should == instance
      end
    end

    context "no id and no alternated_id" do
      it "it should search for the item by id" do
        subject.
          should_receive(:find).
          with(data_hash["id"]).
          and_return(nil)
        subject.
          should_receive(:find_by_alt_key).
          with(data_hash["alt_key"]).
          and_return(nil)
        subject.find_matching(data_hash).should be_nil
      end
    end
  end


  describe "self.create_or_update" do
    let(:update_hash) do
       { "id" => "xyzzy", :value => "xx", "value2" => "yy" }
    end

    context "an existing object exists to update" do
      it "should update the existing object" do
        subject.should_receive(:find_matching).and_return(instance)
        instance.should_receive(:update_attributes).with(update_hash).and_call_original
        updated = subject.create_or_update(update_hash)

        updated.should_not    be_nil
        updated.value2.should eq "yy"
        updated.value.should  eq "xx"
      end
    end

    context "no existing object to update" do

    end
  end

end