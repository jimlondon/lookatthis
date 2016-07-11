// Global state
var $upNext = null;
var $document;
var $body;
var $section;
var $slides;
var $arrows;
var $nextArrow;
var $previousArrow;
var $startCardButton;
var isTouch = Modernizr.touch;
var $likeStory;
var $likeStoryButtons;
var $facebook;
var $facebookBtn;
var $support;
var $supportBtn;
var $didNotLike;
var $dislikeEmail;

var mobileSuffix;
var w;
var h;
var startTouch;
var lastSlideExitEvent;
var callToActionTest;
var ASSETS_PATH = APP_CONFIG.DEPLOYMENT_TARGET ? APP_CONFIG.S3_BASE_URL + '/posts/' + APP_CONFIG.DEPLOY_SLUG + '/assets/' : 'http://assets.apps.npr.org.s3.amazonaws.com/lookatthis/' + APP_CONFIG.DEPLOY_SLUG + '/';
var NO_AUDIO = (window.location.search.indexOf('noaudio') >= 0);

var completion = 0;
var swipeTolerance = 40;
var touchFactor = 1;



var resize = function() {
    /*
     * Resize the content
     */
    w = $(window).width();
    h = $(window).height();
    if ($section.height() < h) {
        $section.height(h);
    }
    $slides.width(w);
};

var onPageLoad = function() {
    /*
    * Set up page on load.
    */
    lazyLoad(0);
    $('.section').css({
        'opacity': 1,
        'visibility': 'visible',
    });
    showNavigation(0);
};

var trackCompletion = function(index) {
    /*
    * Track completion based on slide index.
    */
    how_far = (index + 1) / ($slides.length - APP_CONFIG.NUM_SLIDES_AFTER_CONTENT);

    if (how_far >= completion + 0.25) {
        completion = how_far - (how_far % 0.25);

        if (completion === 0.25) {
            ANALYTICS.completeTwentyFivePercent();
        }
        else if (completion === 0.5) {
            ANALYTICS.completeFiftyPercent();
        }
        else if (completion === 0.75) {
            ANALYTICS.completeSeventyFivePercent();
        }
        else if (completion === 1) {
            ANALYTICS.completeOneHundredPercent();
        }
    }
}

var lazyLoad = function(slideIndex) {
    /*
    * Lazy-load images in current and future slides.
    */
    var slides = [
        $slides.eq(slideIndex),
        $slides.eq(slideIndex + 1),
        $slides.eq(slideIndex + 2)
    ];

    for (var i = 0; i < slides.length; i++) {
        loadImages(slides[i]);
        if (APP_CONFIG.FILMSTRIP) {
            FILMSTRIP.initFilmstrip(slides[i])
        }
    };

}

var loadImages = function($slide) {
    /*
    * Sets the background image on a div for our fancy slides.
    */
    var $container = $slide.find('.imgLiquid');
    var bgimg = $container.children('img');

    // Mobile suffix should be blank by default.
    mobileSuffix = '';

    if (w < 769 && $slide.hasClass('mobile-crop')) {
        mobileSuffix = '-sq';
    }

    if (bgimg.data('bgimage')) {
        var image_filename = bgimg.data('bgimage').split('.')[0];
        var image_extension = '.' + bgimg.data('bgimage').split('.')[1];
        var image_path = 'assets/' + image_filename + mobileSuffix + image_extension;

        bgimg.attr('src', image_path);
    }

    if (bgimg.attr('src')) {
        $container.imgLiquid({
            fill: true,
            horizontalAlign: "center",
            verticalAlign: "center",
        });
    }

    var $images = $slide.find('img.lazy-load');
    if ($images.length > 0) {
        for (var i = 0; i < $images.length; i++) {
            var image = $images.eq(i).data('src');
            $images.eq(i).attr('src', 'assets/' + image);
        }
    }
};

var showNavigation = function(index) {
    /*
    * Hide and show arrows based on slide index
    */
    if (index === 0) {
        $arrows.hide();
        $previousArrow.css('left', 0);
        $nextArrow.css('right', 0);
    } else if ($slides.last().index() === index) {
        $arrows.show();
        $nextArrow.hide().css('right', 0);
    } else {
        $arrows.show();
    }

    if (isTouch) {
        resetArrows();
    }
}

var checkOverflow = function(index) {
    var $thisSlide = $slides.eq(index);
    var slideHeight = $thisSlide.height();
    var blockHeight = $thisSlide.find('.full-block').height();

    if (blockHeight > slideHeight) {
        $thisSlide.parents('.section').height(blockHeight);
    } else {
        $thisSlide.parents('.section').height(h);
    }
}

var onSlideChange = function(e, fromIndex, toIndex) {
    /*
    * Called transitioning between slides.
    */
    lazyLoad(toIndex);
    showNavigation(toIndex);
    trackCompletion(toIndex);
    checkOverflow(toIndex);
    document.activeElement.blur();

    if (APP_CONFIG.AUDIO) {
        AUDIO.checkForAudio(toIndex);
    }
    if (APP_CONFIG.VIDEO) {
        VIDEO.checkForVideo(toIndex);
    }
    if (APP_CONFIG.FILMSTRIP) {
        FILMSTRIP.clearFilmstrip(fromIndex);
        FILMSTRIP.animateFilmstrip(toIndex);
    }
    if (APP_CONFIG.PROGRESS_BAR) {
        PROGRESS_BAR.animateProgress(toIndex);
    }

    ANALYTICS.exitSlide(fromIndex.toString());
    ANALYTICS.trackEvent(lastSlideExitEvent, fromIndex.toString());
    if (toIndex === $slides.length - 1) {
        ANALYTICS.trackEvent('tests-run', callToActionTest);
    }
}

var onStartCardButtonClick = function() {
    /*
    * Called when clicking the "go" button.
    */
    lastSlideExitEvent = 'exit-start-card-button-click';
    $.deck('next');
}

var onDocumentKeyDown = function(e) {
    /*
    * Called when key is pressed
    */
    var keyOptions = $.deck('getOptions').keys;
    var keys = keyOptions.next.concat(keyOptions.previous);
    if (keys.indexOf(e.which) > -1) {
        lastSlideExitEvent = 'exit-keyboard';
        ANALYTICS.useKeyboardNavigation();
    }
    return true;
}

var onSlideClick = function(e) {
    /*
    * Advance on slide tap on touch devices
    */
    if (isTouch && !$(e.target).is('button')) {
        lastSlideExitEvent = 'exit-tap';
        $.deck('next');
    }
}

var onNextPostClick = function(e) {
    /*
     * Click next post
     */
    e.preventDefault();
    ANALYTICS.trackEvent('next-post');
    window.top.location = NEXT_POST_URL;
    return true;
}

var fakeMobileHover = function() {
    /*
     * Fake hover when tapping buttons
     */
    $(this).css({
        'background-color': '#fff',
        'color': '#000',
        'opacity': .9
    });
}

var rmFakeMobileHover = function() {
    /*
     * Remove fake hover when tapping buttons
     */
    $(this).css({
        'background-color': 'rgba(0, 0, 0, 0.2)',
        'color': '#fff',
        'opacity': .3
    });
}

var onNextArrowClick = function() {
    /*
     * Next arrow click
     */
    lastSlideExitEvent = 'exit-next-button-click';
    $.deck('next');
}

var onPreviousArrowClick = function() {
    /*
     * Previous arrow click
     */
    lastSlideExitEvent = 'exit-previous-button-click';
    $.deck('prev');
}

var onTouchStart = function(e) {
    /*
     * Capture start position when swipe initiated
     */
    if (!startTouch) {
        startTouch = $.extend({}, e.originalEvent.targetTouches[0]);
    }
}

var onTouchMove = function(e) {
    /*
     * Track finger swipe
     */


    $.each(e.originalEvent.changedTouches, function(i, touch) {
        if (!startTouch || touch.identifier !== startTouch.identifier) {
            return true;
        }


        var yDistance = touch.screenY - startTouch.screenY;
        var xDistance = touch.screenX - startTouch.screenX;
        var direction = (xDistance > 0) ? 'right' : 'left';

        if (Math.abs(yDistance) < Math.abs(xDistance)) {
            e.preventDefault();
        }

        if (direction == 'right' && xDistance > swipeTolerance) {
            lastSlideExitEvent = 'exit-swipe-right';
        } else if (direction == 'right' && xDistance < swipeTolerance) {
            $previousArrow.filter(':visible').css({
                'left': (xDistance * touchFactor) + 'px'
            });
        }

        if (direction == 'left' && Math.abs(xDistance) > swipeTolerance) {
            lastSlideExitEvent = 'exit-swipe-left';
        } else if (direction == 'left' && Math.abs(xDistance) < swipeTolerance) {
            $nextArrow.filter(':visible').css({
                'right': (Math.abs(xDistance) * touchFactor) + 'px'
            });
        }
    });
}

var onTouchEnd = function(e) {
    /*
     * Clear swipe start position when swipe ends
     */
    $.each(e.originalEvent.changedTouches, function(i, touch) {
        if (startTouch && touch.identifier === startTouch.identifier) {
            startTouch = undefined;
        }
    });
}

var resetArrows = function() {
    /*
     * Reset arrows when advancing slides
     */
    $nextArrow.animate({
        'right': 0
    });
    $previousArrow.animate({
        'left': 0
    });
}

var determineTests = function() {
    var possibleCallToActionTests = ['facebook', 'support'];

    callToActionTest = possibleCallToActionTests[getRandomInt(0, possibleCallToActionTests.length)];
}

var getRandomInt = function(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

var onLikeStoryButtonsClick = function(e) {
    e.preventDefault();

    $likeStory.hide();

    if ($(this).hasClass('yes')) {
        ANALYTICS.trackEvent('like-story-yes', callToActionTest);

        if (callToActionTest === 'facebook') {
            $facebook.show();
        } else {
            $support.show();
        }
    } else {
        ANALYTICS.trackEvent('like-story-no');
        $didNotLike.show();
    }
}

var onFacebookBtnClick = function(e) {
    e.preventDefault();

    var $this = $(this);
    var link = $this.attr('href');

    ANALYTICS.trackEvent('facebook-share');

    window.top.location = link
    return true;
}

var onSupportBtnClick = function(e) {
    e.preventDefault();

    var $this = $(this);
    var link = $this.attr('href');

    ANALYTICS.trackEvent('support-btn-click');

    window.top.location = link
    return true;
}

var onDislikeEmailClick = function() {
    ANALYTICS.trackEvent('email-btn-click');
}






$(document).ready(function() {
    $document = $(document);
    $body = $('body');
    $section = $('.section');
    $slides = $('.slide');
    $navButton = $('.primary-navigation-btn');
    $startCardButton = $('.btn-go');
    $arrows = $('.controlArrow');
    $previousArrow = $arrows.filter('.prev');
    $nextArrow = $arrows.filter('.next');
    $upNext = $('.up-next');
    $likeStory = $('.like-story');
    $likeStoryButtons = $('.btn-like-story');
    $facebook = $('.facebook');
    $facebookBtn = $('.btn-facebook');
    $support = $('.support');
    $supportBtn = $('.btn-support');
    $didNotLike = $('.did-not-like');
    $dislikeEmail = $('.dislike-email');

    $startCardButton.on('click', onStartCardButtonClick);
    //$slides.on('click', onSlideClick);
    $likeStoryButtons.on('click', onLikeStoryButtonsClick);
    $facebookBtn.on('click', onFacebookBtnClick);
    $supportBtn.on('click', onSupportBtnClick);
    $dislikeEmail.on('click', onDislikeEmailClick);

    $upNext.on('click', onNextPostClick);
    $document.on('deck.change', onSlideChange);

    $previousArrow.on('click', onPreviousArrowClick);
    $nextArrow.on('click', onNextArrowClick);

    if (isTouch) {
        $arrows.on('touchstart', fakeMobileHover);
        $arrows.on('touchend', rmFakeMobileHover);
        $body.on('touchstart', onTouchStart);
        $body.on('touchmove', onTouchMove);
        $body.on('touchend', onTouchEnd);
    }

    // Turn off Modernizr history when deploying
    if (APP_CONFIG.DEPLOYMENT_TARGET) {
        Modernizr.history = null;
    }

    $.deck($slides, {
        touch: { swipeTolerance: swipeTolerance }
    });

    onPageLoad();
    resize();
    determineTests();

    // Redraw slides if the window resizes
    $(window).on("orientationchange", resize);
    $(window).resize(resize);
    $document.keydown(onDocumentKeyDown);
});


//demo of the iOS 7 Homescreen Parallax effect, using web tech
    //Detailed article about how it's done at http://www.webdirections.org/blog/parallax
// http://www.webdirections.org/blog/the-ios-7-homescreen-parallax-effect-in-the-browser/

if (isTouch  && window.orientation !== null) {
    var xOffset = -20;
    var yOffset = -20;
}
    //a calculated offset for the x and y origins
    //global var to keep it really simple for the demo, I know not ideal!

function orientationChanged (orientationEvent) {

    if (isTouch  && window.orientation !== null) {
    
    if (    ($("body").hasClass("on-slide-0")==true) || ($("body").hasClass("on-slide-1")==true) || ($("body").hasClass("on-slide-2")==true)    ) {


    var beta = orientationEvent.beta;
    var gamma = orientationEvent.gamma;
    //get the rotation around the x and y axes from the orientation event
    
    if (window.orientation !== null) {
        //don't check for truthiness as window.orientation can be 0!
        var screenOrientation = window.orientation;
    
        if (screenOrientation === -90) {
            //rotated to the left 90 degrees
            
            //beta = orientationEvent.gamma
            gamma = -1 * orientationEvent.beta
        }

        if (screenOrientation === 90) {
            //beta = -1 * orientationEvent.gamma
            gamma = orientationEvent.beta

        }
    
        if (screenOrientation === 180) {
            //beta = -1 * orientationEvent.beta
            gamma = -1 * orientationEvent.gamma
        }
    }
    
    var tanOfGamma = Math.tan(gamma*(Math.PI/180))
    //var tanOfBeta = Math.tan((beta -45)*(Math.PI/180))
    //calculate the tan of the rotation around the X and Y axes
    //we treat beta = 45degrees as neutral
    //Math.tan takes radians, not degrees, as the argument
    
    var backgroundDistance = 20 
    //set the distance of the background from the foreground
    //the smaller, the 'closer' an object appears
    
    var xImagePosition = (-1 * tanOfGamma * backgroundDistance) + xOffset
    //var yImagePosition = (-0.5 * tanOfBeta * backgroundDistance) + yOffset
    //calculate the distance to shift the background image horizontally
    
    //now we need to adjust for the device's orientation
   

    
    //$body.backgroundPosition = xImagePosition + "px " + yImagePosition + "px";
    //set the backgroundimage position to  xImagePosition yImagePosition

    //$('.imgLiquid').css('background-position', xImagePosition + 'px ' + yImagePosition + 'px');
    if (xImagePosition>0) {
        xImagePosition=0;
    }
    if (xImagePosition<-40) {
        xImagePosition=-40;
    }


     $('#slide-start .imgLiquid').css('background-position', xImagePosition + 'px ' + '');
     
        
            console.log(xImagePosition);
    }
}
}
    if (isTouch  && window.orientation !== null) {

        
        window.addEventListener("deviceorientation", orientationChanged, false)
        //add the event listener for deiceOrientation events  
        

    }
