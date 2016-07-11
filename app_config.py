#!/usr/bin/env python

"""
Project-wide application configuration.

DO NOT STORE SECRETS, PASSWORDS, ETC. IN THIS FILE.
They will be exposed to users. Use environment variables instead.
See get_secrets() below for a fast way to access them.
"""

import os

from authomatic.providers import oauth2
from authomatic import Authomatic

"""
NAMES
"""
# Project name to be used in urls
# Use dashes, not underscores!
PROJECT_SLUG = 'view'

# Project name to be used in file paths
PROJECT_FILENAME = 'view'

# The name of the repository containing the source
REPOSITORY_NAME = 'view'
REPOSITORY_URL = 'git@github.com:jimlondon/%s.git' % REPOSITORY_NAME

# Project name used for assets rig
# Should stay the same, even if PROJECT_SLUG changes
ASSETS_SLUG = 'view'

POST_PATH = 'posts'

"""
DEPLOYMENT
"""

# boto module doesn't like dots n the names for the irish buckets(!)
# also had to create a boto helper file:
# $ nano ~/.boto
#   [s3]
#   host=s3-eu-west-1.amazonaws.com
# The official list of AWS endpoints is here:
# http://docs.aws.amazon.com/general/latest/gr/rande.html#s3_region



PRODUCTION_S3_BUCKET = {
    'bucket_name': 'go.jameshouston.com',
    'region': 'eu-west-1'
}

STAGING_S3_BUCKET = {
    'bucket_name': 'stage-jameshouston-com',
    'region': 'eu-west-1'
}

ASSETS_S3_BUCKET = {
    'bucket_name': 'assets-jameshouston-com',
    'region': 'eu-west-1'
}

DEFAULT_MAX_AGE = 20
ASSETS_MAX_AGE = 86400


# These variables will be set at runtime. See configure_targets() below
S3_BUCKET = None
S3_BASE_URL = None
S3_DEPLOY_URL = None
DEBUG = True

"""
COPY EDITING
"""
COPY_GOOGLE_DOC_KEY = '1OLTamxMDavAzZApdmeZIapxYczOe5k77GZRC7SAdFv4'
COPY_ROOT = 'data'

"""
SHARING
"""
SHARE_URL = 'http://%s/%s/' % (PRODUCTION_S3_BUCKET, PROJECT_SLUG)

"""
ADS
"""

NPR_DFP = {
    'STORY_ID': '1002',
    'TARGET': 'homepage',
    'ENVIRONMENT': 'NPRTEST',
    'TESTSERVER': 'false'
}

"""
SERVICES
"""
TUMBLR_GOOGLE_ANALYTICS = {
    'ACCOUNT_ID': 'UA-xxxxxxx-xx',
}

PROJECT_GOOGLE_ANALYTICS = {
    'ACCOUNT_ID': 'UA-80550897-1',
    'DOMAIN': PRODUCTION_S3_BUCKET['bucket_name'],
    'TOPICS': '' # e.g. '[1014,3,1003,1002,1001]'
}

VIZ_GOOGLE_ANALYTICS = {
    'ACCOUNT_ID': 'UA-5828xxx-xx'
}

DISQUS_UUID = 'e90a2863-0148-11e4-93ac-xxxxxxxxx'

"""
OAUTH
"""

GOOGLE_OAUTH_CREDENTIALS_PATH = '~/.google_oauth_credentials'

authomatic_config = {
    'google': {
        'id': 1,
        'class_': oauth2.Google,
        'consumer_key': os.environ.get('GOOGLE_OAUTH_CLIENT_ID'),
        'consumer_secret': os.environ.get('GOOGLE_OAUTH_CONSUMER_SECRET'),
        'scope': ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/userinfo.email'],
        'offline': True,
    },
}

authomatic = Authomatic(authomatic_config, os.environ.get('AUTHOMATIC_SALT'))

"""
Utilities
"""
def get_secrets():
    """
    A method for accessing our secrets.
    """
    secrets = [
        'TUMBLR_CONSUMER_KEY',
        'TUMBLR_CONSUMER_SECRET',
        'TUMBLR_TOKEN',
        'TUMBLR_TOKEN_SECRET',
        'TWITTER_API_CONSUMER_KEY',
        'TWITTER_API_CONSUMER_SECRET',
        'TWITTER_API_OAUTH_TOKEN',
        'TWITTER_API_OAUTH_SECRET',
        'FACEBOOK_API_APP_TOKEN'
    ]

    secrets_dict = {}

    for secret in secrets:
        name = '%s_%s' % (PROJECT_FILENAME, secret)
        secrets_dict[secret] = os.environ.get(name, None)

    return secrets_dict

def configure_targets(deployment_target):
    """
    Configure deployment targets. Abstracted so this can be
    overriden for rendering before deployment.
    """
    global S3_BUCKET
    global S3_BASE_URL
    global S3_DEPLOY_URL
    global DEBUG
    global DEPLOYMENT_TARGET
    global APP_LOG_PATH
    global DISQUS_SHORTNAME
    global TUMBLR_NAME

    if deployment_target == 'production':
        S3_BUCKET = PRODUCTION_S3_BUCKET
        S3_BASE_URL = 'http://%s/%s' % (S3_BUCKET['bucket_name'], PROJECT_SLUG)
        S3_DEPLOY_URL = 's3://%s/%s' % (S3_BUCKET['bucket_name'], PROJECT_SLUG)
        DISQUS_SHORTNAME = 'jim-news'
        DEBUG = False
        TUMBLR_NAME = 'lookatthisstory'
    elif deployment_target == 'staging':
        S3_BUCKET = STAGING_S3_BUCKET
        S3_BASE_URL = 'http://%s/%s' % (S3_BUCKET['bucket_name'], PROJECT_SLUG)
        S3_DEPLOY_URL = 's3://%s/%s' % (S3_BUCKET['bucket_name'], PROJECT_SLUG)
        DISQUS_SHORTNAME = 'jimviz-test'
        DEBUG = True
        TUMBLR_NAME = 'stage-lookatthis'
    elif deployment_target == 'development':
        S3_BUCKET = STAGING_S3_BUCKET
        S3_BASE_URL = 'http://127.0.0.1:8000'
        S3_DEPLOY_URL = None
        DISQUS_SHORTNAME = 'jimviz-test'
        DEBUG = True
        TUMBLR_NAME = 'dev-lookatthis'
    else:
        S3_BUCKET = None
        S3_BASE_URL = 'http://127.0.0.1:8000'
        S3_DEPLOY_URL = None
        DISQUS_SHORTNAME = 'jimviz-test'
        DEBUG = True
        APP_LOG_PATH = '/tmp/%s.app.log' % PROJECT_SLUG
        TUMBLR_NAME = 'dev-lookatthis'

    DEPLOYMENT_TARGET = deployment_target

"""
Run automated configuration
"""
DEPLOYMENT_TARGET = os.environ.get('DEPLOYMENT_TARGET', None)

configure_targets(DEPLOYMENT_TARGET)

WARN_THRESHOLD = 512000
