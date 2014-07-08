#!/usr/bin/env python

import json
from mimetypes import guess_type

from flask import abort

import app_config
import copytext
import envoy
from flask import Blueprint, render_template
from render_utils import flatten_app_config, flatten_post_config
from render_utils import make_context, CSSIncluder, JavascriptIncluder
import static

theme = Blueprint('theme', __name__, url_prefix='/tumblr', template_folder='tumblr/templates')

# Render LESS files on-demand
@theme.route('/less/<string:filename>')
def _theme_less(filename):

    return static.less('tumblr', filename)

# Render application configuration
@theme.route('/js/app_config.js')
def _app_config_js():
    config = flatten_app_config()
    js = 'window.APP_CONFIG = ' + json.dumps(config)

    return js, 200, { 'Content-Type': 'application/javascript' }

# render copytext
@theme.route('/js/copy.js')
def _copy_js():
    return static.copy_js('theme')

# serve arbitrary static files on-demand
@theme.route('/<path:path>')
def _theme_static(path):
    return static.static_file('tumblr', path)

@theme.route('/theme')
def _theme():
    context = make_context()
    context['COPY'] = copytext.Copy(filename='data/theme.xlsx')

    context['JS'] = JavascriptIncluder(asset_depth=0, static_path='tumblr')
    context['CSS'] = CSSIncluder(asset_depth=0, static_path='tumblr')

    return render_template('theme.html', **context)