const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("./mail.db");
const Imap = require('node-imap');
const OpenAI = require('openai');
const { htmlToText } = require('html-to-text');
const simpleParser = require('mailparser').simpleParser;
var fs = require('fs'), fileStream;
var inspect = require('util').inspect

const openai = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
  });

function setupDatabase(){
    db.serialize(function() {
        db.run("CREATE TABLE IF NOT EXISTS users (usersid INTEGER primary key)");
        db.run("CREATE TABLE IF NOT EXISTS email_address (address_id INTEGER primary key , user_id INTEGER, protocol TEXT, host TEXT,address text,password text)");
        db.run("CREATE TABLE IF NOT EXISTS emails (email_id INTEGER primary key, address_id TEXT , subject TEXT, sender TEXT,label integer,recipient text,body text,times timestamp,attachment boolaen, summary text)");
        db.run("CREATE TABLE IF NOT EXISTS summary(summary_id INTEGER primary key , email_id INTEGER references emails(email_id),summary_text text, is_about_schedule boolaen)");
        db.run("CREATE TABLE IF NOT EXISTS schedule (schedule_id INTEGER primary key , summary_id INTEGER references summary(summary_id), start_time timestamp, end_time timestamp)");
        db.run("CREATE TABLE IF NOT EXISTS attachment(attachment_id INTEGER primary key , email_id INTEGER references emails(email_id),type text, file_path file)");
        db.run("CREATE TABLE IF NOT EXISTS contact(contact_id INTEGER primary key , email_id INTEGER references email_address(address_id),name text, address text)");
    });
}

function searchbytype(type,values,callback){
    const sql = "SELECT * FROM emails WHERE ${type} LIKE '%' || ? || '%'";
    db.all(sql,[values],(err,rows)=>{
        if (err) {
            console.error('쿼리 실행 오류:', err.message);
            callback(err, null); // 오류가 발생했을 때 콜백에 오류를 전달하고 빈 배열을 반환
            return;
        }

        // 쿼리 실행이 성공했을 때 rows를 콜백으로 반환
        callback(null, rows);
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
async function htmlToCleanText(dirtytext) {
    let text = htmlToText(dirtytext, {
        wordwrap: 130,
    });
    text = text.replace(/\s+/g, ' ').trim(); // Remove excessive whitespace
    return text;
}
async function summarizeEmails(email_content_promise) {
    const email_content = await email_content_promise;
    console.log("1111111111111111\n"+email_content);
    const completion = await openai.chat.completions.create({            
        messages: [
            {"role": "system", "content": "You are an assistant that helps summarize emails into concise formats."},
            {"role": "user", "content": "다음 정보를 바탕으로 이메일 내용을 정리해 주세요:\n1. 이메일 내용:\n"+email_content+"\n2. 범주 선택: 요청, 제안, 안내, 공지, 문의, 답변, 보고, 컨펌, 인사, 축하, 신청, 제출, 사과 중 하나\n형식은 다음과 같습니다:\n### 범주\n- {category}\n### 요약\n- 핵심 요약 1\n- 핵심 요약 2\n- 핵심 요약 3\n5 줄이 넘도록 요약하지는 않는다.\n### 일정 (있을 경우)\n- [년/월/일/시/분~년/월/일/시/분 형식]: [일정 내용]"}
        ],
        model: "gpt-3.5-turbo",
        max_tokens: 150,
        temperature: 0.3,
    });

    const summary = completion.choices[0].message.content;
    console.log("cccccccccccccccc\n"+summary);
    return summary;    
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
                        summary: ''
                    };
                    Promise.all([
                        new Promise((resolve, reject) => {
                            message.on('body', (stream, info) => {
                                let buffer = '';
                                stream.on('data', (chunk) => {
                                    buffer += chunk.toString('utf8');
                                });
                                stream.once('end', async () => {
                                    simpleParser(buffer, async (err2, mail) => {
                                        if (err2) {
                                            reject(err2);
                                            return;
                                        }
                                        email.times = mail.date.toISOString();
                                        email.subject = mail.subject || '';
                                        email.sender = mail.from.text || '';
                                        email.recipient = (mail.to.text || '').toString();

                                        email.attachments = mail.attachments.length > 0;
                                        // Mail Text 구분을 위해 Prefix 삽입
                                        if (mail.text) {
                                            email.body = mail.text || '';
                                            email.body = 'PLAIN\r\n\r\n' + email.body;
                                            email.summary = await summarizeEmails(htmlToCleanText(email.body));
                                            console.log("aaaaaaaaaaaaaa\n"+email.summary);
                                        }
                                        if (mail.html) {
                                            email.body = mail.html || '';
                                            email.body = 'HTML\r\n\r\n' + email.body;
                                            email.summary = await summarizeEmails(htmlToCleanText(email.body));
                                            console.log("bbbbbbbbbbbbbb\n"+email.summary);
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
                       db.run(`INSERT INTO emails (email_id, address_id, subject, sender, recipient, label, body, times, attachment,summary) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [email.uid, imap._config.user, email.subject, email.sender, email.recipient, 0, email.body, email.times, email.attachments, email.summary], (insertErr) => {
                            });
                    }).catch((error) => {
                    });
                });
            }
        }
        imap.end();
        imap.once('end', function() {
            getSavedEmails(imap._config.user, (err, rows) => {
                if (err) {
                } else {
                    const mail=rows.map(({email_id,sender,subject,body,times})=>({uid:[email_id],from:[sender],subject:[subject],body:[body],times:[times]}));
                    eve.sender.send('getMailListReply', mail);
                }
            });
        })
    } catch (err) {
    }
}

module.exports = {
    setupDatabase,
    searchbytype,
    getSavedEmails,
    fetchNewEmails
};
