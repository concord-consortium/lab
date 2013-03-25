require 'spec_helper'

describe UriHelper do
  let(:remote_definition) { "http://google.com/something/remote.txt" }
  let(:local_definition ) { "something/local" }
  describe "#initialize(intialization-object)" do

    context "with a local file string " do
      subject { UriHelper.from_def(local_definition)}
      its(:kind) { should == UriHelper::Local }
    end
    context "a remote file string" do
      subject { UriHelper.from_def(remote_definition)}
      its(:kind) { should == UriHelper::Remote }
    end

    context "from a remote UriHelper instance" do
      let(:parent) { UriHelper.from_def(remote_definition) }
      subject {   UriHelper.from_def(parent) }
      its(:kind) { should == parent.kind }
    end

    context "without anything" do
      subject { UriHelper.from_def(nil) }
      it { should be_nil }
    end

  end
  describe "#base_dir" do
    context "for a local file" do
      subject { UriHelper.from_def("/something/local/text.json") }
      its(:base_dir) { should == "/something/local" }
    end
    context "for a remote file" do
      subject { UriHelper.from_def("http://google.com/something/remote.txt")}
      its(:base_dir) { should == "/something" }
    end
  end
  describe "#uri_string" do
    context "for a local file" do
      subject { UriHelper.from_def("/something/local/text.json") }
      its(:uri_string) { should == "/something/local/text.json"}
    end
    context "for a remote file" do
      subject { UriHelper.from_def("http://google.com/something/remote.txt")}
      its(:uri_string) { should == "http://google.com/something/remote.txt" }
    end
  end

  describe "#relative_child" do
    context "for a local file" do
      subject { UriHelper.from_def("/something/local/text.json") }
      its(:uri_string) { should == "/something/local/text.json"}
    end
    context "for a remote file" do
      subject { UriHelper.from_def("http://google.com/something/remote.txt")}
      its(:uri_string) { should == "http://google.com/something/remote.txt" }
    end
  end

end