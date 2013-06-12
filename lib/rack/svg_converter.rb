require_relative 'phantom_wrapper'

module Rack
  class SvgConverter
    CONVERT_PATH     = /\/convert_svg\//
    GET_PNG_PATH     = /\/get_png\/([^\/]+)/

    def initialize app
      @app = app
      @wrapper = PhantomWrapper::Base.new()
      puts "initialized"
    end

    def log(string)
      puts string
    end

    def do_convert(req)
      log 'do_convert called'
      headers = {}
      base_url = "#{req.scheme}://#{req.host_with_port}"
      log base_url
      html   = req.POST()['content']
      width  = req.POST()['width'] || 1000
      height = req.POST()['height']||  700

      signature = @wrapper.convert(html,base_url,width,height)
      response_url = "/get_png/#{signature}"
      response_text = "<img src='#{response_url}' alt='#{signature}'>"
      headers['Content-Length'] = response_text.size.to_s
      headers['Content-Type']   = 'text/plain'
      headers['Cache-Control']  = 'no-cache'
      return [200, headers, [response_text]]
    end

    def do_get_png(req)
      log 'do_get_png called'
      headers = {}
      sha =req.path.match(GET_PNG_PATH)[1]
      svg_file = @wrapper.get_png_file(sha)
      headers['Content-Length'] = svg_file.size.to_s
      headers['Content-Type']   = 'image/png'
      headers['Cache-Control']  = 'no-cache'
      return [200, headers, svg_file]
    end

    def hand_off(env)
      log 'calling app default'
      @app.call env
    end

    def call env
      req = Rack::Request.new(env)
      return do_convert(req) if req.path =~ CONVERT_PATH
      return do_get_png(req) if req.path =~ GET_PNG_PATH
      return hand_off(env)
    end
  end
end
