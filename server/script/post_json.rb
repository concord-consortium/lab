#!/usr/bin/env ruby

require 'net/http'
require 'json'
require 'debugger'
require 'json'
# require 'dir'

class WebClient
  attr_accessor :port
  attr_accessor :host
  attr_accessor :local_dir
  attr_accessor :post_route
  attr_accessor :user
  attr_accessor :password

  def initialize(opts={})
    self.port       = opts[:port]       || '3000'
    self.host       = opts[:host]       || '127.0.0.1'
    self.local_dir  = opts[local_dir]   || Dir.pwd
    self.post_route = opts[:post_route] || '/interactives/'
    self.user       = opts[:user]
    self.password   = opts[:password]
  end

  def get_file(filename)
    return JSON.parse(File.read(File.join(self.local_dir,filename)))
  end

  def post(filename,_route = nil)
    route = _route || self.post_route
    data = get_file(filename)

    http = Net::HTTP.new(self.host,self.port)

    request = Net::HTTP::Post.new(route, {'Content-Type' =>'application/json'} )
    request.body = {interactive: data}.to_json
    if (self.user && self.password)
      request.basic_auth self.user, self.password
    end
    response = http.request(request)
    puts response
    puts 
      "Response #{response.code} #{response.message}:
      #{response.body}"
  end

end # </WebClient>

client = WebClient.new()
ARGV.each do |arg|
  client.post(arg)
end
