require 'spec_helper'

describe "Interactives" do
  describe "GET /interactives" do
    it "works! (now write some real specs)", :js => true do
      # Run the generator again with the --webrat flag if you want to use webrat methods/matchers
      # visit '/interactives.html'
      visit interactives_path
      # visit '/embeddable.html#/interactives/interactives_samples_1-oil-and-water-shake'
      # visit '/examples/interactives/interactives'
      status_code.should == 200
      # current_path.should == '/interactives'
      current_path.should == interactives_path
      # page.driver.debug
      # save_and_open_page
      # puts "body = #{body}"
    end
  end
end
