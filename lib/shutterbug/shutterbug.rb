module Shutterbug
  module Shutterbug

    class StreamFile
      def initialize(file)
        @stream_file = file
      end

      def open
        @stream_file.open
        @stream_file.rewind
      end

      def each(&blk)
        @stream_file.each(&blk)
      ensure
        @stream_file.close
      end

      def size
        @stream_file.size
      end
    end

    class PngFile  < StreamFile; end
    class HtmlFile < StreamFile; end
    class JSFile   < StreamFile

      def initialize(_filename)
        @filename = _filename
      end

      def open
        @stream_file = File.open(@filename)
      end
    end

    class Service
      PROGRAM = 'phantomjs'
      RASTERIZE_JS  = File.join(File.dirname(__FILE__),'rasterize.js')
      SHUTTERBUG_JS = File.join(File.dirname(__FILE__),'shutterbug.js')

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
        @js_file = JSFile.new(SHUTTERBUG_JS)
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

      def get_shutterbug_file
        file = @js_file
        file.open
        return file
      end
    end
  end
end
