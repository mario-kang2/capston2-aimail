const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("./mail.db");
const Imap = require('node-imap');
const simpleParser = require('mailparser').simpleParser;
var fs = require('fs'), fileStream;
const { htmlToText } = require('html-to-text');
const OpenAI = require("openai");
var inspect = require('util').inspect;



function setupDatabase(){
    db.serialize(function() {
        db.run("CREATE TABLE IF NOT EXISTS users (usersid INTEGER primary key)");
        db.run("CREATE TABLE IF NOT EXISTS mail_account ([id] integer primary key autoincrement, [description] text, [mailHost] text, [mailPort] int, [mailSecurity] text, [mailUsername] text, [mailEmail] text, [mailPassword] text)");
        db.run("CREATE TABLE IF NOT EXISTS emails (email_id INTEGER primary key, address_id TEXT , subject TEXT, sender TEXT,label integer,recipient text,body text,times timestamp,attachment boolaen)");
        db.run("CREATE TABLE IF NOT EXISTS summary(summary_id INTEGER primary key autoincrement , email_id INTEGER references emails(email_id),summary_text text, is_about_schedule boolean)");
        db.run("CREATE TABLE IF NOT EXISTS schedule (schedule_id INTEGER primary key , summary_id INTEGER references summary(summary_id), start_time timestamp, end_time timestamp, title text)");
        db.run("CREATE TABLE IF NOT EXISTS attachment(attachment_id INTEGER primary key autoincrement , email_id INTEGER references emails(email_id),filename text, content blob)");
        db.run("CREATE TABLE IF NOT EXISTS contact(contact_id INTEGER primary key autoincrement ,name text, address text,phoneNumber text)");
    });
}

async function searchbytype(type,values,callback){

    const sql = 'SELECT * FROM emails WHERE '+type+' LIKE ? order by times';


    db.all(sql, [`%${values}%`], (err, rows) => {
        if (err) {
            console.error('쿼리 실행 오류:', err.message);
            callback(err, null); // 오류가 발생했을 때 콜백에 오류를 전달하고 빈 배열을 반환
            return;
        }
        const emails = rows || [];
        callback(null, emails);
    });

}
function checkDatabase(table) {
    const dbPath = './mail.db';
    const db = new sqlite3.Database(dbPath);

    db.serialize(() => {
        db.each('SELECT * FROM '+table, (err, row) => {
            if (err) {
                console.error('Error while accessing database:', err.message);
                return;
            }
        });
    });

    db.close();
}
function getSavedEmails(address,callback) {
    const sql ='SELECT * FROM emails where address_id=?';
    db.all(sql,[address] ,(err, rows) => {
        if (err) {
            console.error('Error while retrieving emails:', err.message);
            callback([]);
            return;
        }
        const emails = rows || [];
        callback(null,emails);
    });
}
async function fetchNewEmails(imap, eve) {
    try {
        await new Promise((resolve, reject) => {

            imap.once('ready', resolve);
            imap.once('error', reject);
            imap.connect();
        });
        const box = await new Promise((resolve, reject) => {
            imap.openBox('INBOX', true, (err, box) => {
                if (err) reject(err);
                else resolve(box);
            });
        });
        const savedEmails = await new Promise((resolve, reject) => {
            getSavedEmails(imap._config.user, (err, rows) => {

                if (err) {
                    reject(err);}
                else resolve(rows);
            });
        });

        const searchResults = await new Promise((resolve, reject) => {
            imap.search(['ALL'], (err, searchResults) => {
                if (err) reject(err);
                else resolve(searchResults);
            });
        });

        // 삭제된 메일 감지 및 DB에서 삭제
        for (const savedEmail of savedEmails) {
            if (!searchResults.some(uid => uid === savedEmail.email_id)) {
                db.run('DELETE FROM emails WHERE email_id = ?', [savedEmail.email_id]);
            }
        }

        for (const uid of searchResults) {

            if (!savedEmails.some(email => email.email_id === Number(uid))) {
                const f = imap.fetch(uid, { bodies: '', struct: true });
                f.once('message', (message,seno) => {
                    let email = {
                        uid: 0,
                        subject: '',
                        sender:'',
                        recipient: '',
                        body: '',
                        times: new Date().toISOString(),
                        attachments: false,
                        attachment:[]
                    };
                    Promise.all([
                        new Promise((resolve, reject) => {
                            message.on('body', (stream, info) => {
                                let buffer = '';
                                stream.on('data', (chunk) => {
                                    buffer += chunk.toString('utf8');
                                });
                                stream.once('end', () => {
                                    simpleParser(buffer, (err2, mail) => {
                                        if (err2) {
                                            reject(err2);
                                            return;
                                        }
                                        email.times = mail.date.toISOString();
                                        email.subject = mail.subject || '';
                                        email.sender = mail.from.text || '';
                                        if(mail.to) {
                                            email.recipient = (mail.to.text || '').toString();
                                        }
                                        email.attachments = mail.attachments.length > 0;
                                        if(email.attachments){
                                        }
                                        mail.attachments.forEach((attachment)=>{
                                            email.attachment.push({filename:attachment.filename,content:attachment.content})
                                        });


                                        // Mail Text 구분을 위해 Prefix 삽입
                                        if (mail.text) {
                                            email.body = mail.text || '';
                                            email.body = 'PLAIN\r\n\r\n' + email.body;

                                        }
                                        if (mail.html) {
                                            email.body = mail.html || '';
                                            email.body = 'HTML\r\n\r\n' + email.body;
                                        }
                                        resolve();
                                    });
                                });
                            });
                        }),
                        new Promise((resolve, reject) => {
                            message.once('attributes', (attrs) => {
                                email.uid = attrs.uid;
                                resolve();
                            });
                        })
                    ]).then(() => {
                        // body와 attributes 이벤트 핸들러가 모두 완료되면 이메일을 데이터베이스에 저장
                       db.run(`INSERT INTO emails (email_id, address_id, subject, sender, recipient, label, body, times, attachment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [email.uid, imap._config.user, email.subject, email.sender, email.recipient, 0, email.body, email.times, email.attachments], (insertErr) => {
                               if (insertErr) {
                                   //console.error('이메일 저장 오류:',insertErr);
                               } else {
                                   if (email.attachments) {
                                       email.attachment.forEach((attachment) => {
                                           db.run('INSERT INTO attachment(email_id,filename,content) VALUES (?,?,?)',
                                               [email.uid, attachment.filename, attachment.content], (insertErr) => {
                                                   if (insertErr) {
                                                       console.error('첨부파일 저장 오류:', insertErr);
                                                   } else {
                                                   }
                                               });
                                       });
                                   }
                               }
                           });
                    }).catch((error) => {
                        console.error('이메일 처리 오류:', error);
                    });
                });
            }
        }
        imap.end();
        imap.once('end', function() {
            getSavedEmails(imap._config.user, (err, rows) => {
                if (err) {
                    console.error('이메일 가져오기 오류:', err);
                } else {
                    const mail=rows.map(({email_id,sender,subject,body,times})=>({email_id:[email_id],from:[sender],subject:[subject],body:[body],times:[times]}));
                    eve.sender.send('getMailListReply', mail);
                }
            });
        })
    } catch (err) {
        console.error('오류:', err);
    }
}
async function htmlToCleanText(dirtytext) {
    let text = htmlToText(dirtytext, {
        wordwrap: 130,
    });
    text = text.replace(/\s+/g, ' ').replace(/(https?:\/\/[^ ]*)/gi, "").trim(); // Remove excessive whitespace
    return text;
}
async function summarizebyopenai(rawtext,email_id,eve) {
    const OPENAI_API_KEY = require('./apikey.json').OPENAI_API_KEY;
    text = await htmlToCleanText(rawtext[0]);
    //if(!email_id) throw error;
    const query = 'SELECT * FROM summary WHERE email_id = ?';
    db.all(query, email_id[0], async (error, results, fields) => {
        if (error) throw error;
        // 결과 확인
        if (results.length > 0) {
            eve.sender.send('summarizeMailReply', results[0].summary_text);
        } else {
            const openai = new OpenAI({apiKey: OPENAI_API_KEY});
            const response = await openai.chat.completions.create({
                messages: [{"role": "system", "content": "You are a helpful assistant."},
                    {
                        "role": "user",
                        "content": "다음 정보를 바탕으로 이메일 내용을 정리해 주세요:\n1. 이메일 내용:\n" + text + "\n2. 범주 선택: 요청, 제안, 안내, 공지, 문의, 답변, 보고, 컨펌, 인사, 축하, 신청, 제출, 사과 중 하나\n형식은 다음과 같습니다:\n### 범주\n- {category}\n### 요약\n- 핵심 요약 1\n- 핵심 요약 2\n- 핵심 요약 3\n5 줄이 넘도록 요약하지는 않는다.\n### 일정 (있을 경우)\n- [년/월/일/시/분~년/월/일/시/분 형식]: [일정 내용]" +
                            "일정은 범주에 해당하는 내용이다.\n일정은 요약에 표시되더라도 여기에 표시해야한다.\n일정이 없는 경우 ### 일정 (없음)표시\n일정이 있는 경우 ### 일정(있음)표시"
                    }
                ],
                model: "gpt-3.5-turbo",
                temperature: 0.3
            });

            const summary = response.choices[0].message.content;
            const regex = /### 일정 \(없음\)/;
            let is_about_schedule = false;
            if (regex.test(summary)) {
                is_about_schedule = false;
            } else {
                is_about_schedule = true;
            }
            db.run('insert into summary(email_id,summary_text, is_about_schedule) values (?,?,?)',
                [email_id[0], summary, is_about_schedule], (insertErr) => {
                    if (insertErr) {
                        console.error('요약 저장 오류:', insertErr);
                    } else {
                    }
                });
            eve.sender.send('summarizeMailReply', summary);
        }
    });
}
module.exports = {
    setupDatabase,
    searchbytype,
    getSavedEmails,
    fetchNewEmails,
    summarizebyopenai
};