import * as React from 'react';

import type { Meta, StoryObj } from '@storybook/react';
import { AlertCircleIcon, CheckIcon, InfoIcon, XIcon } from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './accordion';
import { Alert, AlertDescription, AlertTitle } from './alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Badge } from './badge';
import { Button } from './button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';
import { Checkbox } from './checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Input } from './input';
import { Label } from './label';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { RadioGroup, RadioGroupItem, RadioGroupItemLabel } from './radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from './sheet';
import { Switch } from './switch';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';
import { Textarea } from './textarea';

const meta: Meta<typeof AllComponents> = {
  title: 'Shadcn/All Components',
  component: AllComponents,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof AllComponents>;

function AllComponents() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [selectValue, setSelectValue] = React.useState('');
  const [radioValue, setRadioValue] = React.useState('option1');
  const [checkboxChecked, setCheckboxChecked] = React.useState<
    boolean | 'indeterminate'
  >(false);
  const [switchChecked, setSwitchChecked] = React.useState(false);
  const [dropdownCheckbox, setDropdownCheckbox] = React.useState<
    boolean | 'indeterminate'
  >(true);
  const [dropdownRadio, setDropdownRadio] = React.useState('option1');

  return (
    <div className="space-y-12 p-8">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Shadcn Components Showcase</h1>
        <p className="text-muted-foreground">
          A comprehensive showcase of all shadcn UI components
        </p>
      </div>

      {/* Buttons */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button>Default</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      {/* Badges */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Badges</h2>
        <div className="flex flex-wrap gap-4">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="info">Info</Badge>
        </div>
      </section>

      {/* Cards */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Cards</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
              <CardDescription>Card description goes here</CardDescription>
            </CardHeader>
            <CardContent>
              <p>This is the card content area.</p>
            </CardContent>
            <CardFooter>
              <Button>Action</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Another Card</CardTitle>
              <CardDescription>With different content</CardDescription>
            </CardHeader>
            <CardContent>
              <p>You can put any content here.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Alerts */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Alerts</h2>
        <div className="space-y-4">
          <Alert>
            <InfoIcon />
            <AlertTitle>Default Alert</AlertTitle>
            <AlertDescription>
              This is a default alert message.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <XIcon />
            <AlertTitle>Destructive Alert</AlertTitle>
            <AlertDescription>
              This is a destructive alert message.
            </AlertDescription>
          </Alert>
          <Alert variant="success">
            <CheckIcon />
            <AlertTitle>Success Alert</AlertTitle>
            <AlertDescription>
              This is a success alert message.
            </AlertDescription>
          </Alert>
          <Alert variant="warning">
            <AlertCircleIcon />
            <AlertTitle>Warning Alert</AlertTitle>
            <AlertDescription>
              This is a warning alert message.
            </AlertDescription>
          </Alert>
          <Alert variant="info">
            <InfoIcon />
            <AlertTitle>Info Alert</AlertTitle>
            <AlertDescription>This is an info alert message.</AlertDescription>
          </Alert>
        </div>
      </section>

      {/* Form Elements */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Form Elements</h2>
        <div className="max-w-md space-y-6">
          <div className="space-y-2">
            <Label htmlFor="input">Input</Label>
            <Input id="input" placeholder="Enter text..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="textarea">Textarea</Label>
            <Textarea id="textarea" placeholder="Enter longer text..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="select">Select</Label>
            <Select value={selectValue} onValueChange={setSelectValue}>
              <SelectTrigger id="select">
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option1">Option 1</SelectItem>
                <SelectItem value="option2">Option 2</SelectItem>
                <SelectItem value="option3">Option 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="checkbox"
              checked={checkboxChecked}
              onCheckedChange={setCheckboxChecked}
            />
            <Label htmlFor="checkbox">Checkbox</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="switch"
              checked={switchChecked}
              onCheckedChange={setSwitchChecked}
            />
            <Label htmlFor="switch">Switch</Label>
          </div>
          <div className="space-y-2">
            <Label>Radio Group</Label>
            <RadioGroup value={radioValue} onValueChange={setRadioValue}>
              <RadioGroupItemLabel selected={radioValue === 'option1'}>
                <RadioGroupItem value="option1" id="radio1" />
                <span>Option 1</span>
              </RadioGroupItemLabel>
              <RadioGroupItemLabel selected={radioValue === 'option2'}>
                <RadioGroupItem value="option2" id="radio2" />
                <span>Option 2</span>
              </RadioGroupItemLabel>
              <RadioGroupItemLabel selected={radioValue === 'option3'}>
                <RadioGroupItem value="option3" id="radio3" />
                <span>Option 3</span>
              </RadioGroupItemLabel>
            </RadioGroup>
          </div>
        </div>
      </section>

      {/* Accordion */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Accordion</h2>
        <Accordion type="single" collapsible className="w-full max-w-2xl">
          <AccordionItem value="item-1">
            <AccordionTrigger>Is it accessible?</AccordionTrigger>
            <AccordionContent>
              Yes. It adheres to the WAI-ARIA design pattern.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Is it styled?</AccordionTrigger>
            <AccordionContent>
              Yes. It comes with default styles that match the other
              components&apos; aesthetic.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>Is it animated?</AccordionTrigger>
            <AccordionContent>
              Yes. It&apos;s animated by default, but you can disable it if you
              prefer.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* Tabs */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Tabs</h2>
        <Tabs defaultValue="account" className="w-full max-w-2xl">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account</CardTitle>
                <CardDescription>
                  Make changes to your account here.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>Account settings content</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="password">
            <Card>
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>Change your password here.</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Password settings content</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>Manage your settings here.</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Settings content</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      {/* Avatar */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Avatar</h2>
        <div className="flex gap-4">
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>AB</AvatarFallback>
          </Avatar>
        </div>
      </section>

      {/* Dropdown Menu */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Dropdown Menu</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Open Menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Team</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={dropdownCheckbox}
              onCheckedChange={setDropdownCheckbox}
            >
              Show notifications
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={dropdownRadio}
              onValueChange={setDropdownRadio}
            >
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              <DropdownMenuRadioItem value="option1">
                Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="option2">
                Dark
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="option3">
                System
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              Logout
              <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </section>

      {/* Dialog */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Dialog</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Are you absolutely sure?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete your
                account and remove your data from our servers.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDialogOpen(false)}
              >
                Continue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      {/* Alert Dialog */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Alert Dialog</h2>
        <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete Account</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your
                account and remove your data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setAlertDialogOpen(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => setAlertDialogOpen(false)}>
                Continue
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>

      {/* Popover */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Popover</h2>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline">Open Popover</Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="space-y-2">
              <h4 className="leading-none font-medium">Dimensions</h4>
              <p className="text-muted-foreground text-sm">
                Set the dimensions for the layer.
              </p>
            </div>
          </PopoverContent>
        </Popover>
      </section>

      {/* Sheet */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Sheet</h2>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline">Open Sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Edit Profile</SheetTitle>
              <SheetDescription>
                Make changes to your profile here. Click save when you&apos;re
                done.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Your name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="your@email.com" />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </section>

      {/* Table */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Table</h2>
        <Table>
          <TableCaption>A list of recent invoices.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">INV001</TableCell>
              <TableCell>
                <Badge variant="success">Paid</Badge>
              </TableCell>
              <TableCell>Credit Card</TableCell>
              <TableCell className="text-right">$250.00</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">INV002</TableCell>
              <TableCell>
                <Badge variant="warning">Pending</Badge>
              </TableCell>
              <TableCell>PayPal</TableCell>
              <TableCell className="text-right">$150.00</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">INV003</TableCell>
              <TableCell>
                <Badge variant="destructive">Unpaid</Badge>
              </TableCell>
              <TableCell>Bank Transfer</TableCell>
              <TableCell className="text-right">$350.00</TableCell>
            </TableRow>
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3}>Total</TableCell>
              <TableCell className="text-right">$750.00</TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </section>
    </div>
  );
}

export const Default: Story = {
  render: () => <AllComponents />,
};
