require 'spec_helper'

describe Interactive do
  let(:group) { create(:samples)}
  subject() { create(:oil_and_water)}

  its(:title) { should == "Oil and Water"}

  it "should be in the correct group" do
    subject.group.name.should == group.name
  end

  it "should have an interactive model" do
    subject.should have(1).interactive_models
    subject.interactive_models.first.viewOptions['controlButtons'].should == "play_reset"
    subject.interactive_models.first.viewOptions['textBoxes'].first['x'].should == 1.08
    # subject.interactive_models.first.viewOptions.textBoxes.y.should == 1.84
    subject.interactive_models.first.viewOptions['textBoxes'].first['text'].should == "Separated Oil and Water"
  end

  it "should validate uniqueness of the title with a group" do
    # NOTE: doesn't seem to break validations when making a copy of the subject above???
    samples_group = create(:samples)
    orig = Interactive.create(:title => "title 1", :group => samples_group, :path => "/interactives/interactives_samples_title_1")
    duplicate = Interactive.create(:title => "title 1", :group => samples_group, :path => "/interactives/interactives_samples_title_1")
    duplicate.should_not be_valid
    duplicate.errors.messages[:title].should == ["title: 'title 1' has already been taken in this group"]
  end

  it "should allow duplicate titles in different groups" do
    samples_group = create(:samples)
    other_group = create(:group, :name => "Some other group" )
    orig = Interactive.create(:title => "title 1", :group => samples_group,  :path => "/interactives/interactives_samples_title_1")
    duplicate = Interactive.create(:title => "title 1", :group => other_group,  :path => "/interactives/interactives_samples_title_1")
    duplicate.should be_valid
  end

  it "should not allow interactives without a title" do
    samples_group = create(:samples)
    interactive = Interactive.create( :path => "/interactives/interactives_samples_title_1")
    interactive.should_not be_valid
  end

  it "should not allow interactives without a empty title" do
    samples_group = create(:samples)
    interactive = Interactive.create(:title => "", :group => samples_group,  :path => "/interactives/interactives_samples_title_1")
    interactive.should_not be_valid
    interactive.errors.messages[:title].first.should == "can't be blank"
  end

  it "should not allow interactives without a path" do
    samples_group = create(:samples)
    interactive = Interactive.create(:title => "some title", :group => samples_group,  :path => "")
    interactive.should_not be_valid
    interactive.errors.messages[:path].first.should == "can't be blank"
  end

end
