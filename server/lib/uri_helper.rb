require 'open-uri'

module UriHelper

  def self.from_def(uri_def)
    return nil unless uri_def
    return uri_def.dup if (uri_def.kind_of? UriHelper::Base)
    return UriHelper::Remote.new(uri_def) if (uri_def.kind_of? URI)
    uri = URI.parse(uri_def)
    if uri.host.nil?
      return UriHelper::Local.new(uri_def)
    else
      return UriHelper::Remote.new(uri)
    end
  end

  class Base
    attr_accessor :instance
    attr_accessor :path
    attr_accessor :relative_root

    def kind
      return self.class
    end

    def base
      return File.dirname(self.path)
    end
    alias :base_dir :base

    def relative_path(path)
      return File.join(self.base,path)
    end

    def set_relative_path(relative)
      self.path = relative_path(relative)
    end

    def read
      # TODO: maybe error trapping
      # will shell out to open-uri
      open(self.uri_string).read
    end

  end


  class Local < UriHelper::Base
    def initialize(path)
      self.path = path
    end

    def join(path)
      return File.join(self.base_path,path)
    end

    def uri_string
      return self.path
    end
  end

  class Remote < UriHelper::Base
    attr_accessor :uri
    def initialize(uri)
      self.uri = uri
    end

    def path
      return self.uri.path
    end

    def uri_string
      return self.uri.to_s
    end

  end

end