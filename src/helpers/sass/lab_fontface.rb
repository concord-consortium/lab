require_relative "../../../script/setup.rb"
module Sass::Script::Functions
  def labFontface()
    Sass::Script::String.new("'#{FONTFACE}'")
  end
end