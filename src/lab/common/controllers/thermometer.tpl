<div class="interactive-thermometer component" id="{{id}}">
  <div class="thermometer-main-container">
    <div class="thermometer">
    </div>
    <p class="label">{{labelText}}</p>
  </div>
  <div class="labels-container">
    {{#labels}}
      <span class="value-label" style="bottom: {{position}}%">{{label}}</span>
    {{/labels}}
  </div>
</div>