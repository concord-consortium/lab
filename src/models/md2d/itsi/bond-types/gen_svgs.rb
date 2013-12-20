#!/bin/env ruby

def r(val)
  '%0.2f' % val
end

def content(opts)
  c = <<EOF
<svg width="175" height="100" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <g>
    <title>Charges</title>
    <defs>
      <linearGradient id="grad1" y2="0" x2="100%" y1="0" x1="0%">
        <stop stop-color="rgb(255,0,0)" offset="0%"/>
        <stop stop-color="rgb(255,255,255)" offset="#{r opts[:grad_offset]}%"/>
        <stop stop-color="rgb(0,0,255)" offset="100%"/>
      </linearGradient>
      <linearGradient id="grad2" y2="0" x2="100%" y1="0" x1="0%">
        <stop stop-color="rgb(0,0,255)" offset="0%"/>
        <stop stop-color="rgb(255,255,255)" offset="#{r opts[:grad_offset]}%"/>
        <stop stop-color="rgb(255,0,0)" offset="100%"/>
      </linearGradient>
      <clipPath id="field">
        <ellipse id="field_1" ry="#{r opts[:left][:ry]}" rx="#{r opts[:left][:rx]}" cy="50" cx="#{r opts[:left][:c]}" stroke="#000000"/>
        <ellipse id="field_2" ry="#{r opts[:right][:ry]}" rx="#{r opts[:right][:rx]}" cy="50" cx="#{r opts[:right][:c]}" stroke="#000000"/>
      </clipPath>
      <clipPath id="field_outline">
        <ellipse id="field_1_outline" ry="#{r opts[:left][:ry] + 0.5}" rx="#{r opts[:left][:rx] + 0.5}" cy="50" cx="#{r opts[:left][:c]}" stroke="#000000"/>
        <ellipse id="field_2_outline" ry="#{r opts[:right][:ry] + 0.5}" rx="#{r opts[:right][:rx] + 0.5}" cy="50" cx="#{r opts[:right][:c]}" stroke="#000000"/>
      </clipPath>
    </defs>
    <rect id="bg_field_outline" x="#{r opts[:bg][:x]}" y="0" width="#{r opts[:bg][:w]}" height="100" clip-path="url(#field_outline)" fill="#000000"/>
    <rect id="bg_gradient" x="#{r opts[:bg][:x]}" y="0" width="#{r opts[:bg][:w]}" height="100" clip-path="url(#field)" fill="#{opts[:bg][:fill]}"/>
    <ellipse id="atom_1" ry="5" rx="5" cy="50" cx="49" fill="#999999"/>
    <ellipse id="atom_2" ry="5" rx="5" cy="50" cx="126" fill="#999999"/>
  </g>
</svg>
EOF
  return c
end

def filename(opts)
  dif = opts[:right][:val] - opts[:left][:val]
  dif = ('%0.2f' % dif).gsub(/\./,'_').gsub(/-/,'neg')
  'images/' + dif + '.svg'
end

dv = 0.17

vals = {
  grad_offset: 38.7,
  left: {
    val: 0.77,
    rx: 29,
    ry: 29,
    c: 49.5
  },
  right: {
    val: 4.0,
    rx: 47.5,
    ry: 47.5,
    c: 125.5
  },
  bg: {
    w: 155,
    x: 20,
    fill: "url(#grad2)"
  }
}

19.times do |i|
  File.open(filename(vals), "w") {|f|
    f.write content(vals)
  }

  vals[:grad_offset] += (11.3/19)
  vals[:left][:val] += dv
  vals[:left][:rx] += (46.0/19)
  vals[:left][:ry] += (11.0/19)
  vals[:left][:c] += 2
  vals[:right][:rx] += (27.5/19)
  vals[:right][:ry] -= (7.5/19)
  vals[:right][:c] -= 2
  vals[:bg][:w] += 605.0/19

  left_edge = (vals[:left][:c] - vals[:left][:rx])
  field_width = (vals[:right][:c] + vals[:right][:rx]) - left_edge
  vals[:bg][:x] = left_edge - ((vals[:bg][:w] - field_width)/2.0)
end

vals[:bg][:fill] = "#ffffff"
File.open(filename(vals), "w") {|f|
  f.write content(vals)
}

vals[:bg][:fill] = "url(#grad1)"
19.times do |i|
  vals[:grad_offset] += (11.3/19)
  vals[:right][:val] -= dv
  vals[:right][:rx] -= (46.0/19)
  vals[:right][:ry] -= (11.0/19)
  vals[:right][:c] += 2
  vals[:left][:rx] -= (27.5/19)
  vals[:left][:ry] += (7.5/19)
  vals[:left][:c] -= 2
  vals[:bg][:w] -= 605.0/19

  left_edge = (vals[:left][:c] - vals[:left][:rx])
  field_width = (vals[:right][:c] + vals[:right][:rx]) - left_edge
  vals[:bg][:x] = left_edge - ((vals[:bg][:w] - field_width)/2.0)

  File.open(filename(vals), "w") {|f|
    f.write content(vals)
  }
end
