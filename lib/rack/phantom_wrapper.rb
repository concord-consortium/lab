module PhantomWrapper

  class StreamFile
    def initialize(file)
      @png_file = file
    end

    def open
      @png_file.open
      @png_file.rewind
    end

    def each(&blk)
      @png_file.each(&blk)
    ensure
      @png_file.close
    end

    def size
      @png_file.size
    end
  end

  class PngFile  < StreamFile; end
  class HtmlFile < StreamFile; end

  class Base
    PROGRAM = 'phantomjs'
    RASTERIZE_JS = File.join(File.dirname(__FILE__),'rasterize.js')

    def document(html, css, url_base)
      date = Time.now.strftime("%Y-%m-%d (%I:%M%p)")
      """
      <!DOCTYPE html>
      <html>
        <head>
          <base href='#{url_base}'>
          <meta content='text/html;charset=utf-8' http-equiv='Content-Type'>
          <title>png from #{url_base} #{date}</title>
          #{css}
        </head>
        <body>
          #{html}
        </body>
      </html>
      """
    end

    def initialize
      @file_cache = {}
    end

    def convert(base_url, html, css="", width=1000, height=700)
      html_content = document(html, css, base_url)
      signature = Digest::SHA1.hexdigest(html_content)[0..10]
      return signature if @file_cache[signature]

      infile = Tempfile.new(['phantom_page','.html'])
      infile_name = infile.path

      outfile = Tempfile.new(['phantom_render','.png'])
      outfile_name = outfile.path

      begin
        infile.write(html_content)
        infile.rewind
        %x[#{PROGRAM} #{RASTERIZE_JS} #{infile_name} #{outfile_name} #{width}*#{height}]
        @file_cache[signature] = {'png' => PngFile.new(outfile), 'html' => HtmlFile.new(infile) }
      ensure
        infile.close
        # infile.unlink
      end
      return signature
    end

    def get_png_file(sha)
      file = @file_cache[sha]['png']
      file.open
      return file
    end

    def get_html_file(sha)
      file = @file_cache[sha]['html']
      file.open
      return file
    end

  end
end
