module Rack
  class Jnlp

    PACK_GZ = '.pack.gz'
    JAR_PACK_GZ = 'jar.pack.gz'
    NO_JAR_PACK_GZ = 'jar.no.pack.gz'
    BYTESIZE = "".respond_to?(:bytesize)

    def initialize app
      @app = app
      @jnlp_dir = JNLP_APP_PATH
    end

    def jnlp_codebase(env)
      scheme = env['rack.url_scheme']
      if http_host = env['HTTP_HOST']
        "#{scheme}://#{http_host}/jnlp"
      else
        "#{scheme}://#{env['SERVER_NAME']}:#{SERVER_PORT}/jnlp"
      end
    end

    def add_jnlp_codebase(body, codebase, assembled_body=[], length=0)
      body.each do |line|
        line = line.to_s # call down the stack
        if line[/^<jnlp.*?>/] && !line[/codebase/]
          line.gsub!(/^(<jnlp.*?)>(.*)/) { |m| "#{$1} codebase='#{codebase}'>#{$2}" }
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
        jars = Dir["#{@jnlp_dir}#{dir}#{name}__*.jar"]
        if jars.empty?
          [nil, suffix]
        else
          [jars.sort.last[/#{@jnlp_dir}(.*)/, 1], suffix]
        end
      else
        [nil, nil]
      end
    end

    def call env
      path = env["PATH_INFO"]
      version_id = env["QUERY_STRING"][/version-id=(.*)/, 1]
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
          if pack200_gzip && ::File.exists?(@jnlp_dir + versioned_jar_path + Rack::Jnlp::PACK_GZ)
            versioned_jar_path << Rack::Jnlp::PACK_GZ
          else
            pack200_gzip = false
          end
          env["PATH_INFO"] = versioned_jar_path
        else
          if pack200_gzip && ::File.exists?(@jnlp_dir + snapshot_path + Rack::Jnlp::PACK_GZ)
            snapshot_path << Rack::Jnlp::PACK_GZ
          else
            pack200_gzip = false
          end
          env["PATH_INFO"] = snapshot_path
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
        body, length = add_jnlp_codebase(body, codebase)
        headers['Content-Length'] = length.to_s
      end
      [status, headers, body]
    end
  end
end
