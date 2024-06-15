import { Badge, Button, Dialog, DialogActions, DialogContent, Divider, Typography } from "@mui/material";
import { DateCalendar, PickersDay, PickersDayProps } from "@mui/x-date-pickers";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers';
import dayjs, { Dayjs } from 'dayjs';
import { useEffect, useState } from "react";

export interface CalendarDialogProps {
    open: boolean;
    onClose: () => void;
}

function dayBadge(props: PickersDayProps<Dayjs> & {highlightedDays?: number[]}) {
    const {highlightedDays = [], day, outsideCurrentMonth, ...other} = props;
    const isSelected = !props.outsideCurrentMonth && highlightedDays.indexOf(props.day.date()) >= 0;
    return (
        <Badge
            key={props.day.toString()}
            overlap="circular"
            badgeContent={isSelected ? '🔵' : undefined}
            >
                <PickersDay {...other} outsideCurrentMonth={outsideCurrentMonth} day={day}/>
            </Badge>
    )
}

export default function AddAccountDialog(props: CalendarDialogProps) {
    const {open, onClose} = props;
    const {ipcRenderer} = window.require("electron");

    const [selectedDate, setSelectedDate] = useState(dayjs());

    const [selectedDateSchedule, setSelectedDateSchedule] = useState([] as any[]);
    const [highlightedDays, setHighlightedDays] = useState([] as number[]);

    const handleClose = () => {
        onClose();
    }

    useEffect(() => {
        let today = dayjs();
        ipcRenderer.send('lookupSchedule', today.format("YYYY-MM-DD")); // 일정 조회 이벤트 전송
        ipcRenderer.once('lookupScheduleReply', (eve:any, res:any) => {
            setSelectedDateSchedule(res);
        });
        ipcRenderer.send('lookupScheduleMonth', today.format("YYYY-MM")); // 일정 조회 이벤트 전송
        ipcRenderer.once('lookupScheduleMonthReply', (eve:any, res:any) => {
            setHighlightedDays(res);
        });
    }, []);

    const handleSelectedDateChange = (newValue: dayjs.Dayjs) => {
        setSelectedDate(newValue);
        ipcRenderer.send('lookupSchedule', newValue.format("YYYY-MM-DD")); // 일정 조회 이벤트 전송
        ipcRenderer.once('lookupScheduleReply', (eve:any, res:any) => {
            setSelectedDateSchedule(res);
        });
    }

    const handleMonthChange = (newValue: dayjs.Dayjs) => {
        // 일정 있는 날짜 확인
        ipcRenderer.send('lookupScheduleMonth', newValue.format("YYYY-MM")); // 일정 조회 이벤트 전송
        ipcRenderer.once('lookupScheduleMonthReply', (eve:any, res:any) => {
            setHighlightedDays(res);
        });
    }

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogContent>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateCalendar value={selectedDate} onChange={handleSelectedDateChange} onMonthChange={handleMonthChange}
                        slots={{day:dayBadge}} slotProps={{day: {highlightedDays} as any}}/>
                </LocalizationProvider>
                <Divider/>
                {selectedDateSchedule.map((schedule, index) => (
                    <>
                        <Typography>{schedule.title}</Typography>
                        <Typography align="right">{schedule.start_time} to {schedule.end_time}</Typography>
                    </>
                ))}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Close</Button>
            </DialogActions>
        </Dialog>
    )
}