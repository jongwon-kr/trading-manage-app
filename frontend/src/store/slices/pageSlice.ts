import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ActivePage = "dashboard" | "analysis" | "journal" | "performance";

interface PageState {
  activePage: ActivePage;
  pageHistory: ActivePage[];
}

const initialState: PageState = {
  activePage: "dashboard",
  pageHistory: ["dashboard"],
};

const pageSlice = createSlice({
  name: "page",
  initialState,
  reducers: {
    setActivePage: (state, action: PayloadAction<ActivePage>) => {
      state.activePage = action.payload;
      if (state.pageHistory[state.pageHistory.length - 1] !== action.payload) {
        state.pageHistory.push(action.payload);
        if (state.pageHistory.length > 10) {
          state.pageHistory = state.pageHistory.slice(-10);
        }
      }
    },
    goBack: (state) => {
      if (state.pageHistory.length > 1) {
        state.pageHistory.pop();
        state.activePage = state.pageHistory[state.pageHistory.length - 1];
      }
    },
    resetPageHistory: (state) => {
      state.pageHistory = [state.activePage];
    },
  },
});

export const { setActivePage, goBack, resetPageHistory } = pageSlice.actions;
export default pageSlice.reducer;
