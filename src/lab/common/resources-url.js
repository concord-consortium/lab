
import config from 'lab.config';
export default function(resourcePath) {
  return config.rootUrl + "/resources/" + resourcePath;
};
