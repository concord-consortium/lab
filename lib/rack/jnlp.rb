module Rack
  class Jnlp

    PACK_GZ = '.pack.gz'
    JAR_PACK_GZ = 'jar.pack.gz'
    NO_JAR_PACK_GZ = 'jar.no.pack.gz'
    JNLP_ARGS = 'jnlp-args'
    BYTESIZE = "".respond_to?(:bytesize)

    JNLP_APP_PATH_ERROR = <<-HEREDOC

  *** JNLP_APP_PATH constant undefined

    HEREDOC

    def initialize app
      @app = app
      raise JNLP_APP_PATH_ERROR unless defined? JNLP_APP_PATH
    end

    def jnlp_codebase(env)
      scheme = env['rack.url_scheme']
      if http_host = env['HTTP_HOST']
        "#{scheme}://#{http_host}/jnlp"
      else
        "#{scheme}://#{env['SERVER_NAME']}:#{SERVER_PORT}/jnlp"
      end
    end

    def process_jnlp(body, codebase, assembled_body=[], jnlp_args)
      length = 0
      if jnlp_args && jnlp_args.length > 0
        jnlp_args = jnlp_args.split(",").collect { |arg| "    <argument>#{arg}</argument>\n" }.join
      end
      body.each do |line|
        line = line.to_s # call down the stack
        if line[/^<jnlp.*?>/] && !line[/codebase/]
          line.gsub!(/^(<jnlp.*?)>(.*)/) { |m| "#{$1} codebase='#{codebase}'>#{$2}" }
        end
        if jnlp_args
          line.gsub!(/(<application-desc.*?>)(.*)?(^\s*<\/application-desc>)/m)  { |m| "#{$1}#{$2}#{jnlp_args}#{$3}" }
        end
        assembled_body << line
        if BYTESIZE
          length += line.bytesize
        else
          length += line.length
        end
      end
      [assembled_body, length]
    end

    def jar_request(path)
      if path =~ /^(\/.*\/)(.*?)\.(jar|jar\.pack\.gz|jar\.no\.pack\.gz)$/
        dir, name, suffix = $1, $2, $3
        jars = Dir["#{JNLP_APP_PATH}#{dir}#{name}__*.jar"]
        if jars.empty?
          [nil, suffix]
        else
          [jars.sort.last[/#{JNLP_APP_PATH}(.*)/, 1], suffix]
        end
      else
        [nil, nil]
      end
    end

    def call env
      path = env["PATH_INFO"]
      query = Hash[*env["QUERY_STRING"].split(/=|&/).flatten]
      version_id = query["version-id"]
      pack200_gzip = versioned_jar_path = jnlp_path = false
      jnlp_path = path[/\.jnlp$/]
      snapshot_path, suffix = jar_request(path)
      if snapshot_path
        pack200_gzip = true if env["HTTP_USER_AGENT"] =~ /java/i        # if jar request and the user agent includes 'java' always try and return pack200-gzip
        accept_encoding = env['HTTP_ACCEPT_ENCODING']
        if (accept_encoding && accept_encoding[/pack200-gzip/]) || suffix == JAR_PACK_GZ
          pack200_gzip = true
        end
        pack200_gzip = false if suffix == NO_JAR_PACK_GZ
        if version_id
          versioned_jar_path = path.gsub(/(.*?)(\.jar$)/, "\\1__V#{version_id}\\2")
          if pack200_gzip && ::File.exists?(JNLP_APP_PATH + versioned_jar_path + Rack::Jnlp::PACK_GZ)
            versioned_jar_path << Rack::Jnlp::PACK_GZ
          else
            pack200_gzip = false
          end
          env["PATH_INFO"] = versioned_jar_path
        else
          if pack200_gzip && ::File.exists?(JNLP_APP_PATH + snapshot_path + Rack::Jnlp::PACK_GZ)
            snapshot_path << Rack::Jnlp::PACK_GZ
          else
            pack200_gzip = false
          end
          env["PATH_INFO"] = snapshot_path
        end
      end
      if jnlp_path
        if version_id
          versioned_jnlp_path = path.gsub(/(.*?)(\.jnlp$)/, "\\1__V#{version_id}\\2")
          env["PATH_INFO"] = versioned_jnlp_path
        else
          env["PATH_INFO"] = path
        end
      end
      status, headers, body = @app.call env
      if snapshot_path
        headers['Content-Type'] = 'application/java-archive'
        headers['x-java-jnlp-version-id'] = version_id       if versioned_jar_path
        headers['content-encoding'] = 'pack200-gzip'         if pack200_gzip
      elsif jnlp_path
        headers['Content-Type'] = 'application/x-java-jnlp-file'
        headers['Cache-Control'] = 'no-cache'
        codebase = jnlp_codebase(env)
        body, length = process_jnlp(body, codebase, query[JNLP_ARGS])
        headers['Content-Length'] = length.to_s
      end
      [status, headers, body]
    end
  end
end
