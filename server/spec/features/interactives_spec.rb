require 'spec_helper'

describe "Interactives" do
  describe "GET /interactives" do
    it "works! (now write some real specs)", :js => true do
      # Run the generator again with the --webrat flag if you want to use webrat methods/matchers
      # visit '/interactives'
      visit '/embeddable.html'
      # page.driver.debug
      # visit '/examples/interactives/interactives_test.html'
      #page.driver.pause
      # visit interactives_path
      # visit '/embeddable.html#/interactives/interactives_samples_1-oil-and-water-shake'
      # visit '/examples/interactives/interactives'
      status_code.should == 200
      current_path.should == '/interactives'
      page.driver.render('/Users/tdyer/code/lab/server/test.png', :full => true)
      # current_path.should == interactives_path
      # save_and_open_page
      # open the chrome inspector debugger
      # page.driver.debug

      # puts "body = #{body}"
    end
  end
end
