const cheerio = require('cheerio');
const sqlite3 = require("sqlite3");
const { htmlToText } = require('html-to-text');
const OpenAI = require("openai");
var inspect = require('util').inspect;
const db = new sqlite3.Database("./mail.db");
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const fetch = require('node-fetch');
const client = new ImageAnnotatorClient({
    keyFilename: './service-account-key.json',
});
const html='HTML\n' +
    '\n' +
    '<html lang="ko">\n' +
    '<meta charset="utf-8">\n' +
    '<!--[if (mso)|(mso 16)]>\n' +
    '<table border="0" cellpadding="0" cellspacing="0" style="width:100%;padding:5px 0 15px;"><tr><td>\n' +
    '<![endif]-->\n' +
    '\t<div id="ds_box" style="font-family: \'맑은 고딕\',\'나눔 고딕\',dotum,Helvetica,sans-serif;line-height:1.5;font-size:12px;color:#666;*word-break:break-all;-ms-word-break:break-all;padding:15px 0;">\n' +
    '        <div class="mail_preview_txt" style="display:none;height:0px;max-height:0;border-width:0px;border-color:initial;line-height:0px;"></div>\n' +
    '        <img src=\'https://directsend.co.kr/index.php/mail_report_api/open/VTc0MTU5Nw/202405/47/yjy61224@naver.com/1499465\' width=\'0\' height=\'0\' style=\'float:left;\'>        <div style="width:100%;max-width:800px;margin:0 auto;"><!--style="margin:0 auto; margin:0 auto 0 0; margin: 0 0 0 auto" 로 정렬-->\n' +
    '            <!--[if (mso)|(mso 16)]>\n' +
    '            <table align="center" border="0" cellpadding="0" cellspacing="0" style="width:800px;"><tr><td>\n' +
    '            <![endif]--><!-- align="left/center/right"로 정렬:아웃룩만-->\n' +
    '            <table border="0" cellpadding="0" cellspacing="0" style="width:100%;min-height:100%;max-width:800px;border:0;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box; margin: 0 auto;" >\n' +
    '                <tr>\n' +
    '                    <td style="padding-bottom:20px;word-break:break-all;border-bottom:1px solid #e1e1e1;">\n' +
    '                        <div style="text-align:center"><a href="https://directsend.co.kr/index.php/mail_report_api/click/VTc0MTU5Nw/202405/47/0/yjy61224@naver.com/17/1499465" target="_blank"><img alt="" height="1165" src="https://directsend.co.kr/index.php/mail_report_api/image_down/VTc0MTU5Nw/1229" width="540"></a></div>\n' +
    '                    </td>\n' +
    '                </tr>\n' +
    '                <tr>\n' +
    '                    <td align="center" style="padding:10px;"><!--푸터 가로폭이 최소, 최대로 맞춰져있기때문에 center로 정렬-->\n' +
    '                                                        <!--[if (mso)|(mso 16)]>\n' +
    '                                <style type="text/css">\n' +
    '                                    .text_Box { line-height:80%; }\n' +
    '                                </style>\n' +
    '                                <![endif]-->\n' +
    '                                <table border="0" cellpadding="0" cellspacing="0" style="text-align:left;width:100%;margin:0 auto;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;">\n' +
    '                                    <tr>\n' +
    '                                        <td style="font-size:12px;font-family:\'맑은 고딕\', Helvetica, sans-serif;color: #999; padding-bottom:10px; padding-top:10px;" class="text_Box">\n' +
    '                                            본 메일은 2024-05-31 19:00:00 기준, 회원님의 메일 수신동의 여부를 확인 후 발송되었습니다.<br />\n' +
    '                                                                                            메일 수신을 원치 않으시면 <a target=\'_blank\' href=\'https://directsend.co.kr/index.php/mail_report_api/reject/VTc0MTU5Nw/202405/47/K/yjy61224@naver.com/1499465\'><b>[수신거부]</b></a>를 클릭하세요.                                                                                    </td>\n' +
    '                                    </tr>\n' +
    '                                    <tr>\n' +
    '                                        <td style="font-size:12px;font-family:\'맑은 고딕\', Helvetica, sans-serif;color: #666;" class="text_Box">\n' +
    '                                            SPOTV NOW | (주)커넥티비티  | 서울특별시 마포구 월드컵북로56길 12, 4층 (상암동, Trutec Building)<br />Email: <a href=\'mailto:spotv_now@spotv.net\'>spotv_now@spotv.net</a>                                        </td>\n' +
    '                                    </tr>\n' +
    '                                                                    </table>\n' +
    '                                            </td>\n' +
    '                </tr>\n' +
    '            </table>\n' +
    '            <!--[if (mso)|(mso 16)]>\n' +
    '            </td></tr></table>\n' +
    '            <![endif]-->\n' +
    '        </div>\n' +
    '    </div>\n' +
    '\t\t<!-- end div first -->\n' +
    '<!--[if (mso)|(mso 16)]>\n' +
    '</td></tr></table>\n' +
    '<![endif]-->\n' +
    '</html>\n'
const alltext=summarizebyopenai(html).then(alltext=>{
    console.log('alltext: '+alltext +"\n length:"+alltext.length);
})
/*extractImageUrlFromHtml(html,'yjy61224@naver.com').then(alltext=>{
    console.log('alltext: '+inspect(alltext) +"\n length:");
    })
    .catch(error => {
        console.error('에러 발생:', error);
    });*/


require('dotenv').config();
//summarizebyopenai(allText);
async function htmlToCleanText(dirtytext) {
    let text = htmlToText(dirtytext, {
        wordwrap: 130,
    });
    text = text.replace(/\s+/g, ' ').replace(/(https?:\/\/[^ ]*)/gi, "").trim(); // Remove excessive whitespace
    return text;
}
async function summarizebyopenai(rawtext,email_id){
    text=await htmlToCleanText(rawtext);
    const openai = new OpenAI({apiKey:''});
    const response = await openai.chat.completions.create({
        messages: [{"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": "다음 정보를 바탕으로 이메일 내용을 정리해 주세요:\n1. 이메일 내용:\n"+text+"\n2. 범주 선택: 요청, 제안, 안내, 공지, 문의, 답변, 보고, 컨펌, 인사, 축하, 신청, 제출, 사과 중 하나\n형식은 다음과 같습니다:\n### 범주\n- {category}\n### 요약\n- 핵심 요약 1\n- 핵심 요약 2\n- 핵심 요약 3\n5 줄이 넘도록 요약하지는 않는다.\n### 일정 (있을 경우)\n- [년/월/일/시/분~년/월/일/시/분 형식]: [일정 내용]" +
                    "일정은 범주에 해당하는 내용이다.\n일정은 요약에 표시되더라도 여기에 표시해야한다.\n일정이 없는 경우 ### 일정 (없음)표시\n일정이 있는 경우 ### 일정(있음)표시"}
        ],
        model: "gpt-3.5-turbo",
        temperature: 0.3
    });

    const summary = response.choices[0].message.content;
    const regex = /### 일정 \(없음\)/;
    if (regex.test(summary)) {
    return summary;
}
async function extractImageUrlFromHtml(html,emailAddress) {
    const $ = cheerio.load(html);
    const imgTags = $('img'); // 모든 img 태그 선택

    const imageUrls = [];
    imgTags.each((index, element) => {
        const imageUrl = $(element).attr('src'); // 각 img 태그의 src 속성 추출
        if (imageUrl && !imageUrl.includes(emailAddress)) {
            imageUrls.push(imageUrl);
        }
    });
    console.log(imageUrls);
    fulltext=''
    try {
        for (const url of imageUrls) {
            const response = await fetch(url);
            const buffer = await response.buffer();
            const [result] = await client.textDetection(buffer);
            const detections = result.textAnnotations;

            fulltext += '\n' + detections[0].description;
        }
    }catch (error){
        console.error('에러:', error);
    }
    return fulltext
}
function emailBodyToText(body){
    let allText=body;
    if (allText.startsWith("PLAIN\r\n\r\n")) { // Plain Text Mail
        allText = allText.replace("PLAIN\r\n\r\n", "");
        allText = allText.replace(/\n/gi, " <br>");
        allText = allText.replace(/(https?:\/\/[^ ]*)/gi, "<a href=\"$&\">$&</a>");
    }
    else { // HTML Mail
        allText = allText.replace("HTML\r\n\r\n", "");
    }
    const $ = cheerio.load(allText);
    const uniqueTexts = {};
    $('*').each((index, ele) => {
        const text = $(ele).clone()
            .children()
            .remove()
            .end()
            .text()
            .trim();
        //console.log(text);
        if (text.length>0) {
            uniqueTexts[text] = true;
        }
    });
// 중복을 제거한 텍스트를 하나의 문자열로 합칩니다
    const text = Object.keys(uniqueTexts).join(' ');
    return text;
}}