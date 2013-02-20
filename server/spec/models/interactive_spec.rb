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
  
end
