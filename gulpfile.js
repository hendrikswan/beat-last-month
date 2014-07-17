var gulp = require('gulp'),
  connect = require('gulp-connect');

gulp.task('connect', function() {
  connect.server({
    livereload: true
  });
});

gulp.task('reload', function () {
    gulp.src(['./*.*', './scripts/*.*', './stylesheets/*.*'])
        .pipe(connect.reload());
});

gulp.task('watch', function () {
  gulp.watch(['./*.*', './scripts/*.*', './stylesheets/*.*'], ['reload']);
});

gulp.task('default', ['connect', 'watch', 'reload']);