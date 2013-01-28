class Md2dModelParser < Parser
  def parse
    url = self.data_hash['url']
    unless data_hash['url'].blank?
      self.adapt_url url
      self.update_from_uri!
    end
    update_db
  end

  def update_db
    id = self.data_hash['id']
    found = Md2dModel.find(id) || Md2dModel.create(self.data_hash)
    found.update(self.data_hash)
  end

  def adapt_url(url)
    if (url.match %r{^/})
      self.uri_helper.path = self.uri_helper.path.sub %r{^(.*/public/).*$} do |match|
        "#{$1}#{url}"  
      end
    end
  end
  
end