require 'spec_helper'

describe InteractiveListParser do
  let(:json_filename) {"complete_list.json"       }
  let(:sample_json)   { read_sample_file json_filename }

  context "establising that the spec helper works" do
    subject { read_sample_file json_filename}
    it "should be a String" do
      subject.should be_a_kind_of String
    end
  end

  describe "#initialize" do
    subject { InteractiveListParser.new(sample_json) }
    context "a simple list with valid interactive definitions in it" do
      its(:interactives) { should have_at_least(90).items } # as of Jan 2013 ~95 interactives
    end

    context "a list which is missing interactives" do
      it "should throw an exception" do
        expect { InteractiveListParser.new("{}") }.to raise_error(InteractiveListParseError)
      end
    end
  end

  describe "self#parse_from_uri(uri)" do
    let(:uri) { "http://a.fake.server.com/foo.json" }
    context "the happy path: a valid json file lives at uri" do
      subject {InteractiveListParser.parse_from_uri(uri)}
      before :each do
        stub_endpoint_with_file(uri,json_filename)
      end
      its(:interactives) { should have_at_least(90).items }
    end

    context "the sad path: no json file lives there" do
      before :each do
        stub_request(:any, uri).to_return(:status => 404)
      end
      it "should throw an exception" do
        expect { InteractiveListParser.parse_from_uri(uri)}.to raise_error(InteractiveListParseError)
      end
    end
  end

end