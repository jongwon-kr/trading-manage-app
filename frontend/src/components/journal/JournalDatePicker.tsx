// src/components/journal/JournalDatePicker.tsx
"use client"

import * as React from "react"
import { format, parse, isValid } from "date-fns"
import { ko } from "date-fns/locale"
import { Calendar as CalendarIcon, X } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/utils/shadcn-util"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input" // Input 임포트
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// --- DatePickerWithRange (필터용) ---
interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  date: DateRange | undefined
  setDate: (date: DateRange | undefined) => void
}

export function DatePickerWithRange({
  className,
  date,
  setDate,
}: DatePickerWithRangeProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[260px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y", { locale: ko })} -{" "}
                  {format(date.to, "LLL dd, y", { locale: ko })}
                </>
              ) : (
                format(date.from, "LLL dd, y", { locale: ko })
              )
            ) : (
              <span>날짜 범위 선택</span>
            )}
            {date && (
                <X 
                    className="ml-auto h-4 w-4 opacity-50" 
                    onClick={(e) => {
                        e.stopPropagation();
                        setDate(undefined);
                    }}
                />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
            locale={ko}
            // 월/연도 드롭다운 추가
            captionLayout="dropdown-nav"
            fromYear={2015}
            toYear={new Date().getFullYear() + 5}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}


// --- DatePicker (폼 입력용 - 키보드 입력 가능) ---
interface DatePickerProps extends React.HTMLAttributes<HTMLDivElement> {
    date: Date | undefined
    setDate: (date: Date | undefined) => void
    placeholder?: string
}

export function DatePicker({
    className,
    date,
    setDate,
    placeholder = "yyyy-MM-dd"
}: DatePickerProps) {
    const [inputValue, setInputValue] = React.useState<string>("");
    const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);

    // 부모의 date 상태가 변경되면(예: 수정 모드) Input 값을 동기화
    React.useEffect(() => {
        if (date) {
            setInputValue(format(date, "yyyy-MM-dd"));
        } else {
            setInputValue("");
        }
    }, [date]);

    // Input 변경 시
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);

        // yyyy-MM-dd 형식일 때 날짜 파싱 시도
        if (value.length === 10) {
            const parsedDate = parse(value, "yyyy-MM-dd", new Date());
            if (isValid(parsedDate)) {
                setDate(parsedDate);
            }
        } else if (value.length === 0) {
            setDate(undefined);
        }
    };

    // Input 포커스 잃었을 때 포맷팅
    const handleInputBlur = () => {
        if (date) {
            setInputValue(format(date, "yyyy-MM-dd"));
        }
    };

    // 캘린더에서 날짜 선택 시
    const handleDateSelect = (selectedDate: Date | undefined) => {
        setDate(selectedDate);
        if (selectedDate) {
            setInputValue(format(selectedDate, "yyyy-MM-dd"));
        }
        setIsPopoverOpen(false);
    };

    return (
        <div className={cn("relative w-full", className)}>
            <Input
                type="text"
                placeholder={placeholder}
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                className="pr-10"
            />
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant={"ghost"}
                        size="icon"
                        className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground"
                    >
                        <CalendarIcon className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    initialFocus
                    locale={ko}
                    captionLayout="dropdown-nav"
                    fromYear={2015}
                    toYear={new Date().getFullYear() + 5}
                    defaultMonth={date}
                />
                </PopoverContent>
            </Popover>
        </div>
    )
}