"use client";

import { Bell, ChevronDown, Search, Settings, Star } from "lucide-react";
import { useState } from "react";

import {
	Button,
	DropdownContent,
	DropdownItem,
	DropdownMenu,
	DropdownSeparator,
	DropdownTrigger,
	Tabs,
	TabItem,
	TabsList,
	TabPanel,
	TabsSubtle,
	TabsSubtleItem,
	ThinkingIndicator,
	ThinkingStep,
	ThinkingSteps,
	ThinkingStepsContent,
	ThinkingStepsHeader,
} from "@synapse/ui/components";

export default function PreviewPage() {
	const [subtleIndex, setSubtleIndex] = useState(0);
	const [dropdownIndex, setDropdownIndex] = useState<number | undefined>(0);

	return (
		<div className="mx-auto flex max-w-3xl flex-col gap-10 p-8">
			<section className="flex flex-col gap-3">
				<h2 className="text-lg font-semibold">Button</h2>
				<div className="flex flex-wrap items-center gap-2">
					<Button>Primary</Button>
					<Button variant="secondary">Secondary</Button>
					<Button variant="outline">Outline</Button>
					<Button variant="ghost">Ghost</Button>
					<Button variant="destructive">Destructive</Button>
					<Button loading>Loading</Button>
					<Button size="sm">
						<Star /> Small
					</Button>
					<Button size="icon" variant="outline" aria-label="Search">
						<Search />
					</Button>
				</div>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-lg font-semibold">Tabs</h2>
				<Tabs defaultValue="overview">
					<TabsList>
						<TabItem value="overview" label="Overview" icon={Settings} />
						<TabItem value="analytics" label="Analytics" icon={Bell} />
						<TabItem value="logs" label="Logs" icon={Search} />
					</TabsList>
					<TabPanel value="overview" className="pt-3 text-sm text-muted-foreground">
						Overview content
					</TabPanel>
					<TabPanel value="analytics" className="pt-3 text-sm text-muted-foreground">
						Analytics content
					</TabPanel>
					<TabPanel value="logs" className="pt-3 text-sm text-muted-foreground">
						Logs content
					</TabPanel>
				</Tabs>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-lg font-semibold">TabsSubtle</h2>
				<TabsSubtle selectedIndex={subtleIndex} onSelect={setSubtleIndex}>
					<TabsSubtleItem index={0} label="Home" icon={Settings} />
					<TabsSubtleItem index={1} label="Notifications" icon={Bell} />
					<TabsSubtleItem index={2} label="Search" icon={Search} />
				</TabsSubtle>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-lg font-semibold">Dropdown</h2>
				<DropdownMenu>
					<DropdownTrigger
						render={
							<Button variant="outline">
								Open menu <ChevronDown />
							</Button>
						}
					/>
					<DropdownContent checkedIndex={dropdownIndex}>
						<DropdownItem
							index={0}
							label="Inbox"
							icon={Bell}
							checked={dropdownIndex === 0}
							onSelect={() => setDropdownIndex(0)}
						/>
						<DropdownItem
							index={1}
							label="Starred"
							icon={Star}
							checked={dropdownIndex === 1}
							onSelect={() => setDropdownIndex(1)}
						/>
						<DropdownSeparator />
						<DropdownItem index={2} label="Settings" icon={Settings} onSelect={() => {}} />
					</DropdownContent>
				</DropdownMenu>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-lg font-semibold">ThinkingIndicator / ThinkingSteps</h2>
				<ThinkingIndicator />
				<ThinkingSteps>
					<ThinkingStepsHeader>Reasoning</ThinkingStepsHeader>
					<ThinkingStepsContent>
						<ThinkingStep label="Searching profiles" status="complete" />
						<ThinkingStep label="Reading portfolio" description="Explored 4 pages" status="active" />
						<ThinkingStep label="Compiling summary" status="pending" isLast />
					</ThinkingStepsContent>
				</ThinkingSteps>
			</section>
		</div>
	);
}
