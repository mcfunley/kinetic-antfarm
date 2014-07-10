;(function() {
  requirejs.config({
    'baseUrl': 'static/js/lib',
    'paths': {
      'jquery': 'http://ajax.googleapis.com/ajax/libs/jquery/1.11.0/jquery.min',
      'bootstrap': 'http://netdna.bootstrapcdn.com/bootstrap/3.1.1/js/bootstrap.min',
      'underscore': 'underscore-min',
      'spin': 'spin.min',
      'home': '../home',
      'md5': 'http://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.2/rollups/md5',
      'kinetic': 'kinetic-v5.1.0.min'
    },
    'shim': {
      'jquery-visibility': ['jquery'],
      'jQuery.resizeEnd': ['jquery']
    }
  });
})();