#!/usr/bin/env python

import imp
import os

from fabric.api import local, require, settings, task
from fabric.state import env
import pytumblr

import app_config

# Other fabfiles
import assets
import data
import issues
import render
import text
import utils

if app_config.DEPLOY_TO_SERVERS:
    import servers

if app_config.DEPLOY_CRONTAB:
    import cron_jobs

# Bootstrap can only be run once, then it's disabled
if app_config.PROJECT_SLUG == '$NEW_PROJECT_SLUG':
    import bootstrap

"""
Base configuration
"""
env.user = app_config.SERVER_USER
env.forward_agent = True

env.hosts = []
env.settings = None

"""
Environments

Changing environment requires a full-stack test.
An environment points to both a server and an S3
bucket.
"""
@task
def production():
    """
    Run as though on production.
    """
    env.settings = 'production'
    app_config.configure_targets(env.settings)
    env.hosts = app_config.SERVERS

@task
def staging():
    """
    Run as though on staging.
    """
    env.settings = 'staging'
    app_config.configure_targets(env.settings)
    env.hosts = app_config.SERVERS

"""
Branches

Changing branches requires deploying that branch to a host.
"""
@task
def stable():
    """
    Work on stable branch.
    """
    env.branch = 'stable'

@task
def master():
    """
    Work on development branch.
    """
    env.branch = 'master'

@task
def branch(branch_name):
    """
    Work on any specified branch.
    """
    env.branch = branch_name

@task
def tests():
    """
    Run Python unit tests.
    """
    local('nosetests')

"""
Deployment

Changes to deployment requires a full-stack test. Deployment
has two primary functions: Pushing flat files to S3 and deploying
code to a remote server if required.
"""
def _deploy_to_s3(path='.gzip'):
    """
    Deploy the gzipped stuff to S3.
    """
    # Clear files that should never be deployed
    local('rm -rf %s/live-data' % path)
    local('rm -rf %s/sitemap.xml' % path)

    exclude_flags = ''
    include_flags = ''

    with open('gzip_types.txt') as f:
        for line in f:
            exclude_flags += '--exclude "%s" ' % line.strip()
            include_flags += '--include "%s" ' % line.strip()

    exclude_flags += '--exclude "www/assets" '

    sync = 'aws s3 sync %s/ %s --acl "public-read" ' + exclude_flags + ' --cache-control "max-age=5" --region "us-east-1"'
    sync_gzip = 'aws s3 sync %s/ %s --acl "public-read" --content-encoding "gzip" --exclude "*" ' + include_flags + ' --cache-control "max-age=5" --region "us-east-1"'
    sync_assets = 'aws s3 sync %s/ %s --acl "public-read" --cache-control "max-age=86400" --region "us-east-1"'

    for bucket in app_config.S3_BUCKETS:
        local(sync % (path, 's3://%s/%s/%s' % (
            bucket,
            app_config.PROJECT_SLUG,
            path.split('.gzip/')[1]
        )))

        local(sync_gzip % (path, 's3://%s/%s/%s' % (
            bucket,
            app_config.PROJECT_SLUG,
            path.split('.gzip/')[1]
        )))

        local(sync_assets % ('www/assets/', 's3://%s/%s/assets/' % (
            bucket,
            app_config.PROJECT_SLUG
        )))

def _gzip(in_path='www', out_path='.gzip'):
    """
    Gzips everything in www and puts it all in gzip
    """
    local('python gzip_assets.py %s %s' % (in_path, out_path))

def _get_post():
    """
    Get the current post we are working on
    """


@task
def update():
    """
    Update all application data not in repository (copy, assets, etc).
    """
    text.update()
    assets.sync()
    data.update()

def _post_to_tumblr():
    """
    Push the currently active post as a draft to the site

    TODO: Tweet in the post body
    """
    require('post', provided_by=[post])

    post_path = '%s/%s/' % (app_config.POST_PATH, env.post)
    post_config = imp.load_source('post_config', '%s/post_config.py' % post_path)
    client = pytumblr.TumblrRestClient(
        os.environ.get('TUMBLR_CONSUMER_KEY', None),
        os.environ.get('TUMBLR_CONSUMER_SECRET', None),
        os.environ.get('TUMBLR_TOKEN', None),
        os.environ.get('TUMBLR_TOKEN_SECRET', None)
    )

    # if the post already exists and has an ID,
    # update the existing post on Tumblr.
    if post_config.ID != '':
        client.edit_post(
            app_config.TUMBLR_NAME,
            id=post_config.ID,
            state='draft',
            type='photo',
            tags=post_config.TAGS,
            format='html',
            source=post_config.PROMO_PHOTO,
            caption=post_config.CAPTION
        )

    # if the post has a no ID, create the new post.
    else:
        client.create_photo(
            app_config.TUMBLR_NAME,
            state='draft',
            tags=post_config.TAGS,
            format='html',
            source=post_config.PROMO_PHOTO,
            caption=post_config.CAPTION
        )

        # find the ID of what we just posted
        drafts = client.drafts(app_config.TUMBLR_NAME)
        most_recent_draft = drafts['posts'][0]['id']

        # write the ID to post_config
        with open('%s/post_config.py' % post_path, 'a') as f:
            f.writelines('\n' 'ID = %s' % most_recent_draft)

@task
def publish():
    """
    Publish the currently active post
    """

    post_path = '%s/%s/' % (app_config.POST_PATH, env.post)
    post_config = imp.load_source('post_config', '%s/post_config.py' % post_path)
    client = pytumblr.TumblrRestClient(
        os.environ.get('TUMBLR_CONSUMER_KEY', None),
        os.environ.get('TUMBLR_CONSUMER_SECRET', None),
        os.environ.get('TUMBLR_TOKEN', None),
        os.environ.get('TUMBLR_TOKEN_SECRET', None)
    )

    client.edit_post(
        'tylertesting',
        id=post_config.ID,
        state='published'
    )

@task
def deploy(slug=''):
    """
    Deploy the latest app to S3 and, if configured, to our servers.
    """
    require('settings', provided_by=[production, staging])
    require('post', provided_by=[post])

    slug = env.post

    if not slug:
        utils.confirm('You are about about to deploy ALL posts. Are you sure you want to do this? (Deploy a single post with "deploy:SLUG".)')


    update()
    render.render_all()
    _gzip('www', '.gzip')
    _gzip('%s/%s/www/' % (app_config.POST_PATH, slug), '.gzip/posts/%s' % slug)
    _post_to_tumblr()
    _deploy_to_s3('.gzip/posts/%s' % slug)

"""
App-specific commands
"""

@task
def post(slug):
    env.post = slug

@task
def new():
    require('post', provided_by=[post])
    post_path = '%s/%s/' % (app_config.POST_PATH, env.post)
    local('cp -r new_post %s' % post_path)
    # TODO
    # download_copy(slug)

"""
Destruction

Changes to destruction require setup/deploy to a test host in order to test.
Destruction should remove all files related to the project from both a remote
host and S3.
"""

@task
def shiva_the_destroyer():
    """
    Deletes the app from s3
    """
    require('settings', provided_by=[production, staging])

    utils.confirm("You are about to destroy everything deployed to %s for this project.\nDo you know what you're doing?" % app_config.DEPLOYMENT_TARGET)

    with settings(warn_only=True):
        sync = 'aws s3 rm %s --recursive --region "us-east-1"'

        for bucket in app_config.S3_BUCKETS:
            local(sync % ('s3://%s/%s/' % (bucket, app_config.PROJECT_SLUG)))

        if app_config.DEPLOY_TO_SERVERS:
            servers.delete_project()

            if app_config.DEPLOY_CRONTAB:
                servers.uninstall_crontab()

            if app_config.DEPLOY_SERVICES:
                servers.nuke_confs()
