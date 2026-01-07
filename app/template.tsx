"use client"

import { AnimatePresence, motion } from "motion/react"

export default function Template({ children }: { children: React.ReactNode }) {
    return (
        <AnimatePresence mode="wait">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="contents"
            >
                {children}
            </motion.div>
        </AnimatePresence>
    )
}
