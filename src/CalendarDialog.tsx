import { Button, Dialog, DialogActions, DialogContent, Typography } from "@mui/material";
import { DateCalendar } from "@mui/x-date-pickers";
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { useState } from "react";

export interface CalendarDialogProps {
    open: boolean;
    onClose: () => void;
}

export default function AddAccountDialog(props: CalendarDialogProps) {
    const {open, onClose} = props;
    const {ipcRenderer} = window.require("electron");

    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [scheduleDate, setScheduleDate] = useState(dayjs()); // 추가: 일정에 해당하는 날짜 상태 추가

    const handleClose = () => {
        onClose();
    }

    const handleSelectedDateChange = (newValue: dayjs.Dayjs) => {
        setSelectedDate(newValue);
    }

    const handleScheduleClick = () => { // 추가: 일정 명시 버튼 클릭 핸들러
        setScheduleDate(selectedDate); // 선택된 날짜를 일정에 대한 날짜로 설정
    }

    return (
        <Dialog open={open} onClose={onClose}>
            <DialogContent>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateCalendar value={selectedDate} onChange={handleSelectedDateChange}/>
                </LocalizationProvider>
                <Typography>선택한 날짜: {selectedDate.format("YYYY-MM-DD")}</Typography>
                <Button onClick={handleScheduleClick}>일정 명시</Button> {/* 추가: 일정 명시 버튼 */}
                <Typography>일정에 해당하는 날짜: {scheduleDate.format("YYYY-MM-DD")}</Typography> {/* 추가: 일정에 해당하는 날짜 표시 */}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Close</Button>
            </DialogActions>
        </Dialog>
    )
}

