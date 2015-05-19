var AUDIO = (function() {
    var isAnimating = false;
    var onStory = false;
    var twentyFiveComplete = false;
    var fiftyComplete = false;
    var seventyFiveComplete = false;
    var completed = false;
    var timesPlayed = 0;

    var setUpPlayer = function() {
        var mp3FilePath = APP_CONFIG.DEPLOYMENT_TARGET ? APP_CONFIG.S3_BASE_URL + '/posts/chris-clark/assets/prototype/whale.mp3' : 'http://assets.apps.npr.org/lookatthis/chris-clark/prototype/whale.mp3';

        $player.jPlayer('setMedia', {
            mp3: mp3FilePath
        });

        $player.jPlayer('play');
    }

    var switchAudio = function() {
        var mp3FilePath = APP_CONFIG.DEPLOYMENT_TARGET ? APP_CONFIG.S3_BASE_URL + '/posts/chris-clark/assets/prototype/audio5.mp3' : 'http://assets.apps.npr.org/lookatthis/chris-clark/prototype/audio5.mp3';

        $player.jPlayer('setMedia', {
            mp3: mp3FilePath
        });

        onStory = true;

        $player.jPlayer('play');

        $play.hide();
        $pause.show();
    }

    var onSeek = function(e) {
        ANALYTICS.trackEvent('seek-audio');
    }

    var onTimeupdate = function(e) {
        var timeText = $.jPlayer.convertTime(e.jPlayer.status.currentTime);
        $currentTime.text(timeText);

        var duration = e.jPlayer.status.duration;
        var position = e.jPlayer.status.currentTime;

        // implementing my own ended event everything is terrible
        if (position > 0 && position >= duration - 0.5) {
            onEnded();
        }

        if (onStory) {
            _trackCompletion(position, duration);
        }
    }

    var _trackCompletion = function(position, duration) {
        var completion = position / duration;

        if (completion >= 0.25 && !twentyFiveComplete) {
            ANALYTICS.completeTwentyFivePercent(timesPlayed);
            twentyFiveComplete = true;
        } else if (completion >= 0.5 && !fiftyComplete) {
            ANALYTICS.completeFiftyPercent(timesPlayed);
            fiftyComplete = true;
        } else if (completion >= 0.75 && !seventyFiveComplete) {
            ANALYTICS.completeSeventyFivePercent(timesPlayed);
            seventyFiveComplete = true;
        }
    }

    var onEnded = function() {
        if (onStory && !completed) {
            ANALYTICS.completeOneHundredPercent(timesPlayed);
            completed = true;

            $slides.eq(currentIndex).find('.full-block-content').addClass('up-next');

            $playerWrapper.velocity({
                'opacity': 0
            }, {
                duration: 2000,
                complete: function() {
                    $playerWrapper.css('visibility', 'hidden');
                }
            });
            $fullscreenButton.css('opacity', 0);
            $nextPostWrapper.velocity('fadeIn', {
                duration: 2000,
                complete: function() {
                    ANALYTICS.trackEvent('tests-run', callToActionTest);
                }
            });

            $previousArrow.css({
                'display': 'block',
            });
            $previousArrow.velocity({
                'opacity': 0.5
            }, {
                duration: 2000
            });

            var $video = $slides.eq(currentIndex).find('video');
            var video = $video.get(0);

            video.pause();
        }
    }

    var _resumePlayer = function() {
        $player.jPlayer('play');
        $play.hide();
        $pause.show();
    }

    var _pausePlayer = function(end) {
        $player.jPlayer('pause');
        if (end) {
            $playedBar.css('width', $thisPlayerProgress.width() + 'px');
        }
        $play.show();
        $pause.hide();
    }

    var toggleAudio = function(e) {
        e.preventDefault();
        if ($player.data().jPlayer.status.paused) {
            _resumePlayer();
            ANALYTICS.trackEvent('resume-audio');
        } else {
            _pausePlayer(false);
            ANALYTICS.trackEvent('pause-audio');
        }
    }
    var reset = function(e) {
        e.preventDefault();

        // reset all completion flags
        twentyFiveComplete = false;
        fiftyComplete = false;
        seventyFiveComplete = false;
        completed = false;

        // reset story flag
        onStory = false;

        timesPlayed = timesPlayed + 1;


        $arrows.velocity('fadeOut', { duration: 500 });

        $nextPostWrapper.velocity('fadeOut', {
            duration: 500,
            complete: function() {
                // fade in ui elements
                $slides.eq(currentIndex).find('.full-block-content').removeClass('up-next');
                $introText.velocity('fadeIn', { duration: 2000 });

                // handle desktop
                if (!isTouch) {
                    $fullscreenButton.css('opacity', 0.5)
                    video.play();
                // handle mobile
                } else {
                    resize();
                }

                var mp3FilePath = APP_CONFIG.DEPLOYMENT_TARGET ? APP_CONFIG.S3_BASE_URL + '/posts/chris-clark/assets/prototype/whale.mp3' : 'http://assets.apps.npr.org/lookatthis/chris-clark/prototype/whale.mp3';

                $player.jPlayer('setMedia', {
                    mp3: mp3FilePath
                });
                $player.jPlayer('play');

                $play.hide();
                $pause.show();
            }
        });

        ANALYTICS.trackEvent('reset');
    }

    return {
        'toggleAudio': toggleAudio,
        'setUpPlayer': setUpPlayer,
        'switchAudio': switchAudio,
        'onSeek': onSeek,
        'onTimeupdate': onTimeupdate,
        'reset': reset,
        'onEnded': onEnded
    }
}());