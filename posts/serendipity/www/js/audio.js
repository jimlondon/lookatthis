var $audioPlayer = null;

var AUDIO = (function() {
    var audioURL = null;
    var $thisPlayerProgrress = null;
    var $playedBar = null;
    var $controlBtn = null;

    var checkForAudio = function(slideIndex) {
        for (var i = 0; i < COPY.content.length; i++) {
            var rowAnchor = COPY.content[i]['id'];
            var filename = COPY.content[i]['audio'];

            var $currentSlide = $slides.eq(slideIndex);
            var loopId = 'slide-' + rowAnchor;
            if (loopId === $currentSlide.attr('id') && filename !== null) {
                audioURL = ASSETS_PATH + filename;
                $thisPlayerProgress = $currentSlide.find('.player-progress');
                $playedBar = $currentSlide.find('.player-progress .played');
                $controlBtn = $currentSlide.find('.control-btn');

                $thisPlayerProgress.on('click', onSeekBarClick);
                $controlBtn.on('click', onControlBtnClick);

                _playAudio();
                break;
            } else {
                if ($audioPlayer.data().jPlayer.status.paused === false) {
                    _pauseAudio();
                }
            }
        }
    }

    var setupAudio = function() {
        $audioPlayer.jPlayer({
            swfPath: 'js/lib',
            loop: false,
            supplied: 'mp3',
            timeupdate: onTimeupdate,
            volume: NO_AUDIO ? 0 : 1
        });
    }

    var _playAudio = function() {
        $audioPlayer.jPlayer('setMedia', {
            mp3: audioURL
        }).jPlayer('play');
        console.log($audioPlayer);
        $controlBtn.removeClass('play').addClass('pause');
    }

    var _pauseAudio = function() {
        $audioPlayer.jPlayer('pause');
        $controlBtn.removeClass('pause').addClass('play');
    }

    var _resumeAudio = function() {
        $audioPlayer.jPlayer('play');
        $controlBtn.removeClass('play').addClass('pause');
    }


    var onTimeupdate = function(e) {
        var totalTime = e.jPlayer.status.duration;
        var position = e.jPlayer.status.currentTime;

        // animate progress bar
        var percentage = position / totalTime;

        if (position > 0) {
            // if we're resetting the bar. ugh.
            if ($playedBar.width() == $thisPlayerProgress.width()) {
                $playedBar.addClass('no-transition');
                $playedBar.css('width', 0);
            } else {
                $playedBar.removeClass('no-transition');
                $playedBar.css('width', $thisPlayerProgress.width() * percentage + 'px');

                if (percentage === 1) {
                    $controlBtn.removeClass('pause').addClass('play');
                }
            }
        }
    }

    var toggleAudio = function() {
        if ($audioPlayer.data().jPlayer.status.paused) {
            _resumeAudio();
        } else {
            _pauseAudio();
        }
    }

    var onSeekBarClick = function(e) {
        var totalTime = $audioPlayer.data().jPlayer.status.duration;
        var percentage = e.offsetX / $(this).width();
        var clickedPosition = totalTime * percentage;
        $audioPlayer.jPlayer('play', clickedPosition);
        $controlBtn.removeClass('play').addClass('pause');
        ANALYTICS.trackEvent('seek', $audioPlayer.data().jPlayer.status.src);
    }

    var onControlBtnClick = function(e) {
        e.preventDefault();
        toggleAudio();
        ANALYTICS.trackEvent('audio-pause-button');
        e.stopPropagation();
    }

    return {
        'checkForAudio': checkForAudio,
        'setupAudio': setupAudio,
    }
}());

$(document).ready(function() {
    $audioPlayer = $('#audio-player');
    AUDIO.setupAudio();
});
