/*
    Copyright � 2010-2013 Alexander S. Klenin
    Copyright � 2013 Natalia D. Zemlyannikova
    Licensed under GPL version 2 or later.
    http://github.com/klenin/AQuiz
*/

"use strict";

function parseArgs() {
    var s = document.location.search;
    var args = {};
    var p = 0;
    while (true) {
        var np = s.indexOf('=', p);
        if (np < 0) break;
        var name = s.substring(p + 1, np);
        p = s.indexOf(';', np);
        if (p < 0) p = s.length;
        var value = s.substring(np + 1, p);
        args[name] = value;
    }
    return args;
}

var Question = $.inherit(
{
    __constructor: function (src) {
        this.text = src.text;
        this.answer = src.answer || null;
        this.correct = src.correct;
    },

    ui: function () {},

    makeVariants: function (variantUI, variants, makeVariant) {
        var variantTemplate = variantUI.children('.variantTemplate');
        variantUI.children().not('.variantTemplate').remove();
        $.each(variants, function (i, text) {
            var elem = variantTemplate.clone().removeClass('hidden variantTemplate');
            makeVariant(elem, i, text);
            variantUI.append(elem);
        });
        return variantUI;
    },

    show: function () {
        var ui = this.ui();
        ui.children('.questionText').html(this.text);
        ui.show();
    },

    isCorrect: function () { return this.answer == this.correct; },
});


var ChoiceQuestion = $.inherit(Question,
{
    __constructor: function (src) {
        this.__base(src);
        this.variants = [];
    },

    prepareVariant: function (index, elem) {},

    show: function () {
        this.__base();
        var that = this;
        this.makeVariants(this.ui().children('ul'), this.variants,
            function (elem, i, text) {
                elem.children('input').attr('id', i + 1);
                elem.children('label').html(text).attr('for', i + 1);
                that.prepareVariant(i, elem);
            });
    },
});

var SingleChoiceQuestion = $.inherit(ChoiceQuestion,
{
    __constructor: function (src) {
        this.__base(src);
        if (src.variants)
            for (var i = 0; i < src.variants.length; ++i)
                this.variants.push(src.variants[i]);
    },
    
    ui: function () { return $('#singleChoice'); },

    prepareVariant: function (index, elem) {
        elem.children('input')[0].checked = this.answer == index;
    },

    rememberAnswer: function () {
        var that = this;
        this.answer = null;
        $('#singleChoice input').each(function (i) {
            if (this.checked)
                that.answer = this.id - 1;
        });
    },

    answerToText: function (answer) { return answer + 1; },
});

var MultiChoiceQuestion = $.inherit(ChoiceQuestion,
{
    __constructor: function (src) {
        this.__base(src);
        if (src.variants)
            for (var i = 0; i < src.variants.length; ++i)
                this.variants.push(src.variants[i]);
    },

    ui: function () { return $('#multiChoice'); },

    prepareVariant: function (index, elem) {
        if (this.answer !== null)
            elem.children('input')[0].checked = this.answer[index];
    },

    rememberAnswer: function () {
        var answer = [];
        var hasAnswer = false;
        $('#multiChoice input').each(function (i) {
            if (this.id) {
                answer[this.id - 1] = this.checked ? 1 : 0;
                if (this.checked) hasAnswer = true;
            }
        });
        this.answer = hasAnswer ? answer : null;
    },

    answerToText: function (answer) { return answer.join(','); },

    isCorrect: function () {
        for (var i = 0; i < this.answer.length; ++i)
            if (this.answer[i] != this.correct[i])
                return false;
        return true;
    },
});

var DirectInputQuestion = $.inherit(Question,
{
    __constructor: function (src) {
        this.__base(src);
    },
    
    ui: function () { return $('#directInput'); },

    input: function () { return this.ui().children('input')[0]; },

    show: function () {
        this.__base();
        this.input().value = this.answer;
    },

    rememberAnswer: function () {
        this.answer = this.input().value;
        if (!this.answer)   
            this.answer = null;
    },

    answerToText: function (answer) { return answer; },
});

var SortableQuestion = $.inherit(Question,
{
    __constructor: function (src) {
        this.__base(src);
        this.variants = [];
        if (src.variants)
            for (var i = 0; i < src.variants.length; ++i)
                this.variants.push(src.variants[i]);
    },

    ui: function () { return $('#sortable'); },

    show: function () {
        this.__base();
        var answer = this.answer;
        if (answer === null) {
            answer = [];
            for (var i = 0; i < this.variants.length; ++i)
                answer.push(i);
        }
        var that = this;
        this.makeVariants(this.ui().children('ul'), answer, function (elem, i, text) {
            elem.attr('id', text).html(that.variants[text]);
        }).sortable();
    },

    rememberAnswer: function () {
        this.answer = $.map(this.ui().children('ul').children('li'), function (elem) {
            return elem.id ? elem.id : null;
        });
    },

    answerToText: function (answer) {
        var that = this;
        return $.map(answer, function (elem) { return that.variants[elem]}).join(',');
    },

    isCorrect: function () {
        for (var i = 0; i < this.answer.length; ++i)
            if (this.answer[i] != this.correct[i])
                return false;
        return true;
    },
});

var MatchQuestion = $.inherit(Question,
{
    __constructor: function (src) {
        this.__base(src);
        this.lvariants = [];
        this.rvariants = [];
        if (src.variants)
            for (var i = 0; i < src.variants[0].length; ++i) {
                this.lvariants.push(src.variants[0][i]);
                this.rvariants.push(src.variants[1][i]);
            }
    },

    ui: function () { return $('#match'); },

    trs: function () { return $('#match table tr'); },

    show: function () {
        this.__base();
        var answer = this.answer;
        if (answer === null) {
            answer = [];
            for (var i = 0; i < this.lvariants.length; ++i)
                answer.push(i);
        }
        var variants = [];
        for (var i = 0; i < this.lvariants.length; ++i) {
            variants.push([ this.lvariants[i], answer[i] ]);
        }
        var that = this;
        this.makeVariants(this.ui().children('table'), variants, function (elem, i, text) {
            elem.children('th.static').html(text[0]);
            elem.children('th.sortable').attr('id', text[1]).html(that.rvariants[text[1]]);
        });

        this.ui().children('table').sortable({
            items: "tr",
            update: function (event, ui) {
                $.each(that.trs().not('.hidden'), function (i, elem) {
                    $(this).children('th.static').html(that.lvariants[i]);
                });
            },
            start: function (event, ui) {
                ui.item.children('td:first-child').hide();
            },
            stop: function (event, ui) {
                ui.item.children('td:first-child').show();
            }
        }).disableSelection();
    },

    rememberAnswer: function () {
        this.answer = $.map(this.trs().children('th.sortable'), function (elem) {
            return elem.id ? elem.id : null;
        });
    },

    answerToText: function (answer) {
        var that = this;
        return $.map(answer, function (elem) { return that.rvariants[elem]}).join(',');
    },

    isCorrect: function () {
        for (var i = 0; i < this.answer.length; ++i)
            if (this.answer[i] != this.correct[i])
                return false;
        return true;
    },
});

var Quiz = $.inherit(
{
    __constructor: function (quizUrl) {
        this.currentQuestion = 0;
        this.questions = [];
    },

    load: function (quizUrl) {
        var that = this;
        var questionTypes = {
            sc: SingleChoiceQuestion,
            mc: MultiChoiceQuestion,
            di: DirectInputQuestion,
            sr: SortableQuestion,
            mt: MatchQuestion,
        };
        var settings = {
            url: quizUrl,
            dataType: 'json',
            timeout: 10000,
            success: function (quizJSON) {
                that.questions = $.map(quizJSON, function (v, i) {
                    return new questionTypes[v.type](v);
                });
                that.updateGotoButtons();
                that.showCheckSumbitAnswers();
                $('#waiting').hide();
                $('#controlButtons').show();
                that.showQuestion();
            },
            error: function (req, textStatus, err) {
                req.abort();
                setTimeout(
                    function (q, url) { q.load(url); }, 4000, that, quizUrl);
            },
        };
        $.ajax(settings);
    },

    updateAnswered: function (button, question) {
        if (question.answer !== null)
            button.addClass('answered');
        else
            button.removeClass('answered');
    },

    updateGotoButtons: function () {
        var that = this;
        var s = $('#questionNumbers');
        var btnTemplate = s.children('input');
        $.each(this.questions, function (i, q) {
            var b = btnTemplate.clone().val(i + 1);
            that.updateAnswered(b, q);
            s.append(b.show());
        });
    },

    showCheckSumbitAnswers: function () {
        if (typeof(quiz_submit_url) == 'function')
            $('#submitAnswersButton').show()[0].disabled = false;
        var show = false;
        for (var i = 0; i < this.questions.length && !show; ++i)
            show = this.questions[i].correct !== undefined;
        if (!show) return;
        $('#checkAnswersButton').show()[0].disabled = false;
        var t = $('#checkAnswers table');
        var rowTemplate = t.children('tr.hidden');
        for (var i = 0; i < this.questions.length; ++i)
            t.append(rowTemplate.clone().show());
    },

    checkAnswers: function () {
        this.leaveQuestion();
        var rows = $('#checkAnswers table tr');
        for (var i = 0; i < this.questions.length; ++i) {
            var r = $(rows[i + 2]);
            var td = r.children('td');
            $(td[0]).text(i + 1);
            var q = this.questions[i];
            $(td[1]).text(q.answer === null ? '?' : q.answerToText(q.answer));
            $(td[2]).text(q.correct === null ? '?' : q.answerToText(q.correct));
            r.removeClass('correct wrong');
            if (q.answer !== null && q.correct !== null) {
                r.addClass(q.isCorrect() ? 'correct' : 'wrong');
            }
        }
        $('#checkAnswers').show();
    },

    submitAnswers: function () {
        this.leaveQuestion();
        if (confirm('Are you sure?')) {
            var answers = [];
            $.each(this.questions, function (i, q) {
                answers[i] = q.answer;
            });
            $.post(
                quiz_submit_url(), { answers: JSON.stringify(answers) },
                function () { alert('Results submitted'); }
            );
        }
        this.showQuestion();
    },

    gotoButton: function (btn) {
        this.leaveQuestion();
        this.currentQuestion = $(btn).val() - 1;
        this.showQuestion();
    },

    nextOk: function () {
        return this.currentQuestion < this.questions.length - 1;
    },

    prevOk: function () {
        return this.currentQuestion > 0;
    },

    nextQuestion: function () {
        if (!this.nextOk()) return;
        this.leaveQuestion();
        ++this.currentQuestion;
        this.showQuestion();
    },

    prevQuestion: function () {
        if (!this.prevOk()) return;
        this.leaveQuestion();
        --this.currentQuestion;
        this.showQuestion();
    },

    currentGotoButton: function () {
        var v = (this.currentQuestion + 1);
        return $('#questionNumbers input[value=' + v + ']');
    },

    leaveQuestion: function () {
        var q = this.questions[this.currentQuestion];
        q.ui().hide();
        q.rememberAnswer();
        $('#nextQuestion')[0].disabled = true;
        $('#prevQuestion')[0].disabled = true;
        var b = this.currentGotoButton();
        this.updateAnswered(b, q);
        b[0].disabled = false;
    },

    showQuestion: function () {
        $('#checkAnswers').hide();
        this.questions[this.currentQuestion].show();
        $('#nextQuestion')[0].disabled = !this.nextOk();
        $('#prevQuestion')[0].disabled = !this.prevOk();
        this.currentGotoButton()[0].disabled = true;
    },
});
