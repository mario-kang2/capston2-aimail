const {app, BrowserWindow, ipcMain, shell} = require('electron');
const path = require('path');
const url = require('url');
const sqlite3 = require('sqlite3');
const management = require("./emailmanagement");
const dayjs = require('dayjs');

const db = new sqlite3.Database("./mail.db");

function createWindow() {
    const win = new BrowserWindow({
        width:1024,
        height:768,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });

    const startUrl = process.env.ELECTRON_START_URL || url.format({
        pathname: path.join(__dirname, '/../build/index.html'),
        protocol: 'file:',
        slashes: true
    });

    win.webContents.on('new-window', function(e, url) {
        e.preventDefault();
        shell.openExternal(url);
    })

    win.loadURL(startUrl);

    management.setupDatabase();
}



app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC 핸들러
// 계정 정보 테이블 생성
ipcMain.on('createAccountDatabase', (_) => {
    db.run('CREATE TABLE IF NOT EXISTS mail_account ([id] integer primary key autoincrement, [description] text, [mailHost] text, [mailPort] int, [mailSecurity] text, [mailUsername] text, [mailEmail] text, [mailPassword] text);', err => {});
    db.run('CREATE TABLE IF NOT EXISTS mail_send_account ([id] integer primary key autoincrement, [description] text, [mailHost] text, [mailPort] int, [mailSecurity] text, [mailUsername] text, [mailEmail] text, [mailPassword] text);', err => {});
})

// 계정 정보 테이블 조회
ipcMain.on('lookupAccountDatabase', (eve) => {
    db.all('SELECT * FROM mail_account', (err, rows) => {
        eve.sender.send('lookupAccountDatabaseReply', rows);
    });
})
// 보내는 계정 정보 테이블 조회
ipcMain.on('lookupSendAddressDatabase', (eve) => {
    db.all('SELECT * FROM mail_send_account', (err, rows) => {
        eve.sender.send('lookupSendAccountDatabaseReply', rows);
    })
})
ipcMain.on('lookupContactsDatabase', (eve) => {
    db.all('SELECT * FROM contact', (err, rows) => {
        eve.sender.send('lookupContactsDatabaseReply', rows);
    });
})

// IMAP 유효성 검사
ipcMain.on('validateImap', (eve, args) => {
    const Imap = require('node-imap');
    const imap = new Imap({
        user: args.user,
        password: args.password,
        host: args.host,
        port: args.port,
        tls: args.tls,
    });

    imap.once('ready', () => {
        imap.end();
        eve.sender.send('validateImapReply', true);
    });

    imap.once('error', (err) => {
        imap.end();
        eve.sender.send('validateImapReply', false);
    });

    imap.connect();
})

// SMTP 유효성 검사
ipcMain.on('validateSmtp', (eve, args) => {
    const Smtp = require('nodemailer');
    const smtp = Smtp.createTransport({
        host: args.host,
        port: args.port,
        secure: args.tls,
        auth: {
            user: args.user,
            pass: args.pass
        }
    });

    smtp.verify(function (err, success) {

        if (err) {
            eve.sender.send('validateSmtpReply', false);
        } else {
            eve.sender.send('validateSmtpReply', true);
        }
    });
})

// 계정 정보 추가 
ipcMain.on('addAccount', (eve, args) => {
    db.run('INSERT INTO mail_account (description, mailHost, mailPort, mailSecurity, mailUsername, mailEmail, mailPassword) VALUES (?, ?, ?, ?, ?, ?, ?)', [args.description, args.host, args.port, args.security, args.username, args.emailAddress, args.password], err => {
        eve.sender.send('addAccountReply', err);
    });
});

// 보내는 계정 정보 추가 
ipcMain.on('addSendAccount', (eve, args) => {
    db.run('INSERT INTO mail_send_account (description,mailHost,mailPort,mailSecurity,mailUsername,mailEmail,mailPassword) VALUES (?, ?, ?, ?, ?, ?, ?)', [args.description, args.host, args.port, args.security, args.username, args.emailAddress, args.password], err => {
        eve.sender.send('addSendAccountReply', err);
    });
});

//요약
ipcMain.on('summarizeMail', (eve, args) => {
    const body=args.body;
    const email_id=args.email_id;
    management.summarizebyopenai(body,email_id,eve);
});

// 메일 목록 조회 (IMAP)
ipcMain.on('getMailList', (eve, args) => {
    const Imap = require('node-imap');
    const imap = new Imap({
        user: args.mailEmail,
        password: args.mailPassword,
        host: args.mailHost,
        port: args.mailPort,
        tls: args.mailSecurity === 'ssl' || args.mailSecurity === 'starttls'
    });
    management.fetchNewEmails(imap,eve);
});

// 계정 정보 삭제
ipcMain.on('removeAccount', (eve, args) => {
    db.run('DELETE FROM mail_account WHERE description = ?', [args.description], err => {
        eve.sender.send('removeAccountReply', err);
    })
})

// 보내는 계정 정보 삭제
ipcMain.on('removeSendAccount', (eve, args) => {
    db.run('DELETE FROM mail_send_account WHERE description = ?', [args.description], err => {
        eve.sender.send('removeSendAccountReply', err);
    })
})
ipcMain.on('searchMaillist', (eve, args) => {
    const column=args.searchBy;
    const value=args.query;
    management.searchbytype(column,value, (err, rows) => {
        if (err) {
            console.error('이메일 검색 오류:', err);
        } else {
            const mail=rows.map(({email_id,sender,subject,body,times})=>({email_id:[email_id],from:[sender],subject:[subject],body:[body],times:[times]}));
            eve.sender.send('searchMailListReply', mail);
        }
    })
})

// 메일 삭제
ipcMain.on('deleteMail', (eve, args) => {
    const Imap = require('node-imap');
    const imap = new Imap({
        user: args.auth.mailEmail,
        password: args.auth.mailPassword,
        host: args.auth.mailHost,
        port: args.auth.mailPort,
        tls: args.auth.mailSecurity === 'ssl' || args.auth.mailSecurity === 'starttls',
    });
    const uid = args.index[0].toString();
    imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => {
            if (err) {
                eve.sender.send('deleteMailReply', false);
            } else {
                imap.addFlags(uid, '\\Deleted', (err) => {
                    if (err) {
                        eve.sender.send('deleteMailReply', false);
                    } else {
                        imap.end();
                        eve.sender.send('deleteMailReply', true);
                    }
                });
            }
        });
    });
    imap.connect();
});

// 메일 전송
ipcMain.on('sendMail', (eve, args) => {

    // 인증 정보 불러오기
    let from = args.from;
    let to = args.to;
    let cc = args.cc;
    let bcc = args.bcc;
    let subject = args.subject;
    let content = args.content;

    db.get('SELECT * FROM mail_send_account WHERE mailEmail = ?', [from], (err, row) => {
        if (row) {
            const Smtp = require('nodemailer');
            const smtp = Smtp.createTransport({
                host: row.mailHost,
                port: row.mailPort,
                secure: row.mailSecurity === 'ssl',
                auth: {
                    user: row.mailEmail,
                    pass: row.mailPassword
                }
            });

            let mailOptions = {
                from: from,
                to: to,
                cc: cc,
                bcc: bcc,
                subject: subject,
                text: content
            };

            smtp.sendMail(mailOptions, (err, info) => {
                if (err) {
                    eve.sender.send('sendMailReply', false);
                } else {
                    eve.sender.send('sendMailReply', true);
                }
            });
        }
    });
})

ipcMain.on('searchMail', (eve, searchBy,query) => {
    const type=searchBy;
    const value=query;
    management.searchbytype(type,value, (err, rows) => {
        if (err) {
            console.error('이메일 가져오기 오류:', err);
        } else {
            const mail=rows.map(({email_id,sender,subject,body,times})=>({email_id:[email_id],from:[sender],subject:[subject],body:[body],times:[times]}));
            eve.sender.send('searchMailReply', mail);
        }
    });
})
// 연락처 데이터 조회
ipcMain.on('lookupContactDatabase', (eve) => {
    db.all('SELECT * FROM contact', (err, rows) => {
        eve.sender.send('lookupContactDatabaseReply', rows);
    });
})

// 연락처 데이터 추가
ipcMain.on('addContact', (eve, args) => {
    db.run('INSERT INTO contact (Name, Address) VALUES (?, ?)', [args.name, args.address], err => {
    });
})

// 연락처 데이터 삭제
ipcMain.on('removeContact', (eve, args) => {
    db.run('DELETE FROM contact WHERE Address = ?', [args.address], err => {
    })
})

// 로컬 요약 데이터 조회
ipcMain.on('lookupLocalSummary', (eve, args) => {
    db.all('SELECT * FROM summary WHERE email_id = ?', args, async (err, rows) => {
        if (rows.length > 0) {
            eve.sender.send('lookupLocalSummaryReply', rows[0].summary_text);
        }
        else {
            eve.sender.send('lookupLocalSummaryReply', "");
        }
    });
});

// 로컬 요약 데이터 내 Summary ID 조회
ipcMain.on('lookupSummaryId', (eve, args) => {
    db.all('SELECT * FROM summary WHERE email_id = ?', args, async (err, rows) => {
        if (rows.length > 0) {
            eve.sender.send('lookupSummaryIdReply', rows[0].summary_id);
        }
        else {
            eve.sender.send('lookupSummaryIdReply', -1);
        }
    });
});

// 일정 데이터 조회
ipcMain.on('lookupSchedule', (eve, args) => {
    let date = dayjs(args); // dayjs 객체
    
    let start = date.startOf('day').format('YYYY-MM-DD HH:mm:ss');
    let end = date.endOf('day').format('YYYY-MM-DD HH:mm:ss');

    db.all('SELECT * FROM schedule WHERE start_time <= ? AND end_time >= ?', [end, start], (err, rows) => {
        if (err) {
        } else {
            eve.sender.send('lookupScheduleReply', rows);
        }
    });  
})

ipcMain.on('lookupScheduleMonth', (eve, args) => {
    let date = dayjs(args); // dayjs 객체

    let start = date.startOf('month').format('YYYY-MM-DD HH:mm:ss');
    let end = date.endOf('month').format('YYYY-MM-DD HH:mm:ss');

    db.all('SELECT * FROM schedule WHERE start_time <= ? AND end_time >= ?', [end, start], (err, rows) => {
        if (err) {
        } else {
            var result = [];
            rows.forEach((row) => {
                let start = dayjs(row.start_time).date();
                let end = dayjs(row.end_time).date();

                if (start === end) {
                    if (!result.includes(start))
                        result.push(start);
                }
                else {
                    for (let i = start; i <= end; i++) {
                        if (!result.includes(i))
                            result.push(i);
                    }
                }
            
            })
            eve.sender.send('lookupScheduleMonthReply', result);
        }
    });
})

// summary_id 이용한 일정 데이터 조회
ipcMain.on('lookupScheduleBySummaryId', (eve, args) => {
    db.all('SELECT * FROM schedule WHERE summary_id = ?', args, (err, rows) => {
        if (err) {
        } else {
            eve.sender.send('lookupScheduleBySummaryIdReply', rows);
        }
    });
})

// 일정 데이터 추가
ipcMain.on('addSchedule', (eve, args) => {
    let fromDate = dayjs();
    let toDate = dayjs();

    let fromStr = args.dateFrom.split('/').length === 1 ? args.dateFrom.split('.') : args.dateFrom.split('/');
    let toStr = args.dateTo.split('/').length === 1 ? args.dateTo.split('.') : args.dateTo.split('/');

    fromDate = fromDate.set('year', fromStr[0]);
    fromDate = fromDate.set('month', fromStr[1] - 1);
    fromDate = fromDate.set('date', fromStr[2]);
    fromDate = fromDate.set('hour', args.timeFrom.split(':')[0]);
    fromDate = fromDate.set('minute', args.timeFrom.split(':')[1]);
    fromDate = fromDate.set('second', 0);

    toDate = toDate.set('year', toStr[0]);
    toDate = toDate.set('month', toStr[1] - 1);
    toDate = toDate.set('date', toStr[2]);
    toDate = toDate.set('hour', args.timeTo.split(':')[0]);
    toDate = toDate.set('minute', args.timeTo.split(':')[1]);
    toDate = toDate.set('second', 0);

    let fromDateStr = fromDate.format('YYYY-MM-DD HH:mm:ss');
    let toDateStr = toDate.format('YYYY-MM-DD HH:mm:ss');

    db.run('INSERT INTO schedule (summary_id, start_time, end_time, title) VALUES (?, ?, ?, ?)', [args.summaryID, fromDateStr, toDateStr, args.title]);
})